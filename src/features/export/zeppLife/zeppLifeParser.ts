import { format } from 'date-fns'
import type { DailyEntry } from '@/domain/dailyEntry'

/** One row from `BODY/BODY_*.csv` in a Zepp Life export — only present for
 * dates where a synced scale was used. `time` stays a raw string (UTC,
 * `YYYY-MM-DD HH:mm:ss+ZZZZ`) rather than a `Date` — its fixed-width format
 * sorts correctly as a plain string, which `buildZeppLifePatches` relies on
 * to find the latest same-day reading without ever constructing a `Date`
 * for comparison. */
export interface ZeppBodyRow {
  time: string
  weightKg: number
  fatRatePercent?: number
  bodyWaterRatePercent?: number
  boneMassKg?: number
  muscleRatePercent?: number
  visceralFat?: number
}

/** One row from `ACTIVITY/ACTIVITY_*.csv` — only `steps` maps to anything
 * this app tracks (distance/runDistance/calories are dropped). */
export interface ZeppActivityRow {
  date: string
  steps: number
}

/** The subset of `DailyEntry` a Zepp Life export can fill in — everything
 * else on the day's entry (meals, notes, mood, manually-tracked fields with
 * no Zepp equivalent) is left untouched by the merge in `zeppLifeMerge.ts`. */
export type ZeppLifePatch = Pick<
  DailyEntry,
  | 'weightKg'
  | 'bodyFatPercent'
  | 'bodyWaterPercent'
  | 'boneMassKg'
  | 'visceralFatRating'
  | 'muscleMassKg'
  | 'steps'
>

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
      muscleRatePercent: parseOptionalNumber(cells[muscleRateCol]),
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
  const isoish = time.replace(' ', 'T').replace(/([+-]\d{2})(\d{2})$/, '$1:$2')
  return format(new Date(isoish), 'yyyy-MM-dd')
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * Builds one `ZeppLifePatch` per calendar date out of the export's BODY and
 * ACTIVITY rows. A date can have several BODY rows (e.g. a scale synced
 * twice the same morning, seen in a real sample) — the latest `time` wins,
 * a plain string comparison since every `time` shares the same fixed-width
 * `+0000` UTC format and so sorts correctly as text.
 */
export function buildZeppLifePatches(
  bodyRows: ZeppBodyRow[],
  activityRows: ZeppActivityRow[],
): Map<string, ZeppLifePatch> {
  const patches = new Map<string, ZeppLifePatch>()

  const latestBodyRowByDate = new Map<string, ZeppBodyRow>()
  for (const row of bodyRows) {
    const date = zeppTimeToLocalDate(row.time)
    const existing = latestBodyRowByDate.get(date)
    if (!existing || row.time > existing.time) {
      latestBodyRowByDate.set(date, row)
    }
  }

  for (const [date, row] of latestBodyRowByDate) {
    const patch: ZeppLifePatch = { weightKg: row.weightKg }
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
    // Zepp's muscleRate is a % of body weight, but DailyEntry.muscleMassKg
    // is in kg — not a direct copy, needs converting via this row's weight.
    if (row.muscleRatePercent !== undefined) {
      patch.muscleMassKg = round2((row.weightKg * row.muscleRatePercent) / 100)
    }
    patches.set(date, patch)
  }

  for (const row of activityRows) {
    patches.set(row.date, { ...patches.get(row.date), steps: row.steps })
  }

  return patches
}
