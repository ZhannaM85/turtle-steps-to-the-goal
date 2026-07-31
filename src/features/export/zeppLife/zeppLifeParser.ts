import { parseHealthTimestamp } from '../parseHealthTimestamp'
import type { DailyEntryPatch } from '../mergeDailyEntryPatches'

/** One row from `BODY/BODY_*.csv` in a Zepp Life export — only present for
 * dates where a synced scale was used. `time` stays a raw string (UTC,
 * `YYYY-MM-DD HH:mm:ss+ZZZZ`) — parsed via `parseHealthTimestamp` at the
 * point of use rather than up front, since most rows never need it (only
 * the same-day tiebreak in `buildZeppLifePatches` does). */
export interface ZeppBodyRow {
  time: string
  weightKg: number
  fatRatePercent?: number
  bodyWaterRatePercent?: number
  boneMassKg?: number
  /** Zepp's CSV column is named `muscleRate`, but the value is already kg
   * (matches the in-app "Muscle X kg" reading) — not a % of body weight.
   * Confirmed against a real export + the Zepp Life UI (#458). */
  muscleMassKg?: number
  visceralFat?: number
}

/** One row from `ACTIVITY/ACTIVITY_*.csv` — only `steps` maps to anything
 * this app tracks (distance/runDistance/calories are dropped). */
export interface ZeppActivityRow {
  date: string
  steps: number
}

const BOM = String.fromCharCode(0xfeff)

function splitCsvLines(csvText: string): string[] {
  const withoutBom = csvText.startsWith(BOM)
    ? csvText.slice(BOM.length)
    : csvText
  return withoutBom.split(/\r\n|\n/).filter((line) => line.trim().length > 0)
}

/** `"null"` shows up as a literal string for optional BODY columns when a
 * scale reading skipped a measurement (seen in a real export sample) — same
 * "missing" case as an empty cell. */
function parseOptionalNumber(raw: string | undefined): number | undefined {
  if (raw === undefined || raw === '' || raw === 'null') return undefined
  const value = Number(raw)
  return Number.isFinite(value) ? value : undefined
}

export function parseZeppBodyCsv(csvText: string): ZeppBodyRow[] {
  const lines = splitCsvLines(csvText)
  if (lines.length < 2) return []
  const header = lines[0].split(',')
  const col = (name: string) => header.indexOf(name)
  const timeCol = col('time')
  const weightCol = col('weight')
  if (timeCol === -1 || weightCol === -1) return []
  const fatRateCol = col('fatRate')
  const bodyWaterRateCol = col('bodyWaterRate')
  const boneMassCol = col('boneMass')
  const muscleRateCol = col('muscleRate')
  const visceralFatCol = col('visceralFat')

  const rows: ZeppBodyRow[] = []
  for (const line of lines.slice(1)) {
    const cells = line.split(',')
    const time = cells[timeCol]
    const weightKg = parseOptionalNumber(cells[weightCol])
    if (!time || weightKg === undefined) continue
    rows.push({
      time,
      weightKg,
      fatRatePercent: parseOptionalNumber(cells[fatRateCol]),
      bodyWaterRatePercent: parseOptionalNumber(cells[bodyWaterRateCol]),
      boneMassKg: parseOptionalNumber(cells[boneMassCol]),
      muscleMassKg: parseOptionalNumber(cells[muscleRateCol]),
      visceralFat: parseOptionalNumber(cells[visceralFatCol]),
    })
  }
  return rows
}

const PLAIN_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function parseZeppActivityCsv(csvText: string): ZeppActivityRow[] {
  const lines = splitCsvLines(csvText)
  if (lines.length < 2) return []
  const header = lines[0].split(',')
  const dateCol = header.indexOf('date')
  const stepsCol = header.indexOf('steps')
  if (dateCol === -1 || stepsCol === -1) return []

  const rows: ZeppActivityRow[] = []
  for (const line of lines.slice(1)) {
    const cells = line.split(',')
    const date = cells[dateCol]
    const steps = parseOptionalNumber(cells[stepsCol])
    // Defensive — ACTIVITY had no populated rows in the sample export this
    // was built from, so the exact date format is unconfirmed; a row that
    // doesn't look like a plain YYYY-MM-DD is skipped rather than trusted.
    if (!date || !PLAIN_DATE_RE.test(date) || steps === undefined) continue
    rows.push({ date, steps })
  }
  return rows
}

/** `time` is UTC (e.g. `2026-01-01 06:09:29+0000`) — converted to the
 * calendar date it falls on in the browser's local timezone, matching how
 * every other date in this app (manually-logged entries, "today") is a
 * plain local calendar day rather than a UTC one. */
export function zeppTimeToLocalDate(time: string): string {
  return parseHealthTimestamp(time).localDate
}

/**
 * Builds one `DailyEntryPatch` per calendar date out of the export's BODY
 * and ACTIVITY rows. A date can have several BODY rows (e.g. a scale
 * synced twice the same morning, seen in a real sample) — the latest
 * `time` wins, compared as real instants (`parseHealthTimestamp`'s
 * `epochMs`) rather than as strings, since Zepp's own export always uses a
 * fixed `+0000` offset today but nothing guarantees that stays true.
 */
export function buildZeppLifePatches(
  bodyRows: ZeppBodyRow[],
  activityRows: ZeppActivityRow[],
): Map<string, DailyEntryPatch> {
  const patches = new Map<string, DailyEntryPatch>()

  const latestBodyRowByDate = new Map<
    string,
    { row: ZeppBodyRow; epochMs: number }
  >()
  for (const row of bodyRows) {
    const { localDate, epochMs } = parseHealthTimestamp(row.time)
    const existing = latestBodyRowByDate.get(localDate)
    if (!existing || epochMs > existing.epochMs) {
      latestBodyRowByDate.set(localDate, { row, epochMs })
    }
  }

  for (const [date, { row }] of latestBodyRowByDate) {
    const patch: DailyEntryPatch = { weightKg: row.weightKg }
    if (row.fatRatePercent !== undefined) {
      patch.bodyFatPercent = row.fatRatePercent
    }
    if (row.bodyWaterRatePercent !== undefined) {
      patch.bodyWaterPercent = row.bodyWaterRatePercent
    }
    if (row.boneMassKg !== undefined) {
      patch.boneMassKg = row.boneMassKg
    }
    if (row.visceralFat !== undefined) {
      patch.visceralFatRating = row.visceralFat
    }
    // Column name is `muscleRate`, but the value is already kg — same number
    // Zepp Life shows as "Muscle X kg". Pre-#458 this was wrongly treated as
    // a % of body weight (`weight * rate / 100`), which produced ~22kg that
    // looked confusingly like BMI for this user's scale range.
    if (row.muscleMassKg !== undefined) {
      patch.muscleMassKg = row.muscleMassKg
    }
    patches.set(date, patch)
  }

  for (const row of activityRows) {
    patches.set(row.date, { ...patches.get(row.date), steps: row.steps })
  }

  return patches
}
