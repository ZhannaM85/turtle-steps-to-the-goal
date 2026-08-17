/**
 * #742 — map OCR text from a Zepp Life body-composition / “reached goals”
 * screenshot onto the five DailyEntry fields. Pure string parsing so tests
 * can use text fixtures (this repo is public — do not commit real photos).
 */

export interface ZeppBodyCompositionReading {
  bodyFatPercent?: number
  muscleMassKg?: number
  bodyWaterPercent?: number
  visceralFatRating?: number
  boneMassKg?: number
  /** ISO `YYYY-MM-DD` when the screenshot header included a calendar day. */
  date?: string
}

const MONTHS: Record<string, number> = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sep: 9,
  sept: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
  января: 1,
  янв: 1,
  февраля: 2,
  фев: 2,
  марта: 3,
  мар: 3,
  апреля: 4,
  апр: 4,
  мая: 5,
  июня: 6,
  июн: 6,
  июля: 7,
  июл: 7,
  августа: 8,
  авг: 8,
  сентября: 9,
  сен: 9,
  октября: 10,
  окт: 10,
  ноября: 11,
  ноя: 11,
  декабря: 12,
  дек: 12,
}

const DATE_RE =
  /(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec|января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря|янв|фев|мар|апр|июн|июл|авг|сен|окт|ноя|дек)\.?(?:\s+(\d{4}))?/i

type FieldKey = Exclude<keyof ZeppBodyCompositionReading, 'date'>

interface FieldSpec {
  key: FieldKey
  label: RegExp
  min: number
  max: number
}

// Visceral before body-fat so "visceral fat" does not land on fat %.
const FIELD_SPECS: FieldSpec[] = [
  {
    key: 'visceralFatRating',
    label: /visceral(?:\s*fat)?|висцеральн/i,
    min: 1,
    max: 20,
  },
  {
    key: 'boneMassKg',
    label: /bone(?:\s*mass)?|костн/i,
    min: 0.5,
    max: 8,
  },
  {
    key: 'muscleMassKg',
    label: /muscle|мышц/i,
    min: 10,
    max: 80,
  },
  {
    key: 'bodyWaterPercent',
    label: /(?:body\s*)?water|вода|воде|водой/i,
    min: 20,
    max: 80,
  },
  {
    key: 'bodyFatPercent',
    label: /body\s*fat|fat\s*%|процент\s*жира|жир|\bfat\b/i,
    min: 3,
    max: 60,
  },
]

const SKIP_LINE_RE =
  /bmi|имт|body\s*age|возраст\s*тела|индекс\s*массы|белок|протеин|protein|basal|обмен|ккал|kcal/i

const NUMBER_RE = /(\d{1,3}(?:[.,]\d{1,2})?)\s*(%|％|kg|кг)?/gi

function parseDecimal(raw: string): number | undefined {
  const n = Number(raw.replace(',', '.'))
  return Number.isFinite(n) ? n : undefined
}

function isoDate(year: number, month: number, day: number): string | undefined {
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined
  const dt = new Date(Date.UTC(year, month - 1, day))
  if (
    dt.getUTCFullYear() !== year ||
    dt.getUTCMonth() !== month - 1 ||
    dt.getUTCDate() !== day
  ) {
    return undefined
  }
  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${year}-${mm}-${dd}`
}

/** eng tessdata often reads Russian `августа` as `апреля` (April vs August). */
function preferAsOfMonthForOcr(
  parsedMonth: number,
  asOfMonth: number,
): number {
  if (parsedMonth === 4 && asOfMonth === 8) return 8
  return parsedMonth
}

function parseScreenshotDate(
  text: string,
  asOfDate: string,
): string | undefined {
  const asOfYear = Number(asOfDate.slice(0, 4))
  const asOfMonth = Number(asOfDate.slice(5, 7))
  const asOfDay = Number(asOfDate.slice(8, 10))
  const matches = text.matchAll(new RegExp(DATE_RE.source, 'gi'))
  let fallback: string | undefined
  for (const match of matches) {
    const day = Number(match[1])
    let month = MONTHS[match[2]!.toLowerCase()]
    if (!month || !Number.isFinite(day)) continue
    const yearFromText = Boolean(match[3])
    const year = yearFromText ? Number(match[3]) : asOfYear
    if (!Number.isFinite(year)) continue
    if (day === asOfDay && !yearFromText) {
      month = preferAsOfMonthForOcr(month, asOfMonth)
    }
    const iso = isoDate(year, month, day)
    if (!iso) continue
    if (day === asOfDay && month === asOfMonth) return iso
    fallback ??= iso
  }
  return fallback
}

function numbersOn(line: string): { value: number; unit: string | undefined }[] {
  const found: { value: number; unit: string | undefined }[] = []
  NUMBER_RE.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = NUMBER_RE.exec(line)) !== null) {
    const value = parseDecimal(match[1]!)
    if (value === undefined) continue
    if (value >= 1900 && value <= 2100) continue
    found.push({
      value,
      unit: match[2]?.toLowerCase() === 'кг' ? 'kg' : match[2]?.toLowerCase(),
    })
  }
  return found
}

function pickForSpec(
  spec: FieldSpec,
  candidates: { value: number; unit: string | undefined }[],
): number | undefined {
  const inRange = candidates.filter((c) => {
    if (c.value < spec.min || c.value > spec.max) return false
    if (spec.key === 'visceralFatRating' && !Number.isInteger(c.value)) {
      return false
    }
    return true
  })
  if (inRange.length === 0) return undefined
  if (spec.key === 'bodyFatPercent' || spec.key === 'bodyWaterPercent') {
    const pct = inRange.find((c) => c.unit === '%' || c.unit === '％')
    return (pct ?? inRange[0])!.value
  }
  if (spec.key === 'muscleMassKg' || spec.key === 'boneMassKg') {
    const kg = inRange.find((c) => c.unit === 'kg')
    return (kg ?? inRange[0])!.value
  }
  return inRange[0]!.value
}

function lineWindow(lines: string[], index: number): string {
  return [lines[index], lines[index + 1], lines[index + 2]]
    .filter(Boolean)
    .join(' ')
}

function fillFromLabeledLines(
  lines: string[],
  reading: ZeppBodyCompositionReading,
): void {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    if (SKIP_LINE_RE.test(line)) continue
    for (const spec of FIELD_SPECS) {
      if (reading[spec.key] !== undefined) continue
      if (!spec.label.test(line)) continue
      if (
        spec.key === 'bodyFatPercent' &&
        /visceral|висцеральн/i.test(line)
      ) {
        continue
      }
      const value =
        pickForSpec(spec, numbersOn(line)) ??
        pickForSpec(spec, numbersOn(lineWindow(lines, i)))
      if (value !== undefined) reading[spec.key] = value
    }
  }
}

/**
 * "Didn't reach goals" / "не достигли цели" headers must not wipe the
 * metric Tesseract glued onto the same line (#747). Drop a цели/goal
 * line only when it has no kg/% reading (e.g. "Reached 6 goals").
 */
function isGoalsHeaderWithoutMeasurement(line: string): boolean {
  if (!/goal|цел/i.test(line)) return false
  return !numbersOn(line).some(
    (c) => c.unit === 'kg' || c.unit === '%' || c.unit === '％',
  )
}

/**
 * When labels OCR poorly, classify leftover numbers by unit + typical range.
 * Zepp's list order is BMI, fat %, muscle kg, water %, visceral, bone kg.
 */
function textForUnlabeled(text: string): string {
  return text
    .split(/\r?\n/)
    .filter(
      (line) =>
        !SKIP_LINE_RE.test(line) && !isGoalsHeaderWithoutMeasurement(line),
    )
    .join(' ')
}

function fillFromUnlabeledFallback(
  text: string,
  reading: ZeppBodyCompositionReading,
): void {
  const used = new Set(
    [
      reading.bodyFatPercent,
      reading.muscleMassKg,
      reading.bodyWaterPercent,
      reading.visceralFatRating,
      reading.boneMassKg,
    ].filter((n): n is number => n !== undefined),
  )
  const all = numbersOn(textForUnlabeled(text)).filter(
    (c) => !used.has(c.value),
  )

  if (reading.bodyFatPercent === undefined) {
    const fat = all.find(
      (c) =>
        (c.unit === '%' || c.unit === '％') && c.value >= 8 && c.value <= 45,
    )
    if (fat) {
      reading.bodyFatPercent = fat.value
      used.add(fat.value)
    }
  }
  if (reading.bodyWaterPercent === undefined) {
    const water = all.find(
      (c) =>
        (c.unit === '%' || c.unit === '％') &&
        c.value >= 35 &&
        c.value <= 70 &&
        !used.has(c.value),
    )
    if (water) {
      reading.bodyWaterPercent = water.value
      used.add(water.value)
    }
  }
  if (reading.muscleMassKg === undefined) {
    const muscle = all.find((c) => {
      if (c.value < 15 || c.value > 80 || used.has(c.value)) return false
      if (c.unit === 'kg') return true
      // OCR often drops "кг"; still take a non-integer in the muscle band.
      return c.unit === undefined && !Number.isInteger(c.value)
    })
    if (muscle) {
      reading.muscleMassKg = muscle.value
      used.add(muscle.value)
    }
  }
  if (reading.boneMassKg === undefined) {
    const bone = all.find((c) => {
      if (c.value < 0.8 || c.value > 5 || used.has(c.value)) return false
      if (c.unit === 'kg') return true
      return c.unit === undefined && !Number.isInteger(c.value)
    })
    if (bone) {
      reading.boneMassKg = bone.value
      used.add(bone.value)
    }
  }
  if (reading.visceralFatRating === undefined) {
    const visceral = all.find(
      (c) =>
        c.unit === undefined &&
        Number.isInteger(c.value) &&
        c.value >= 1 &&
        c.value <= 20 &&
        !used.has(c.value),
    )
    if (visceral) reading.visceralFatRating = visceral.value
  }
}

export function hasZeppBodyCompositionValues(
  reading: ZeppBodyCompositionReading,
): boolean {
  return (
    reading.bodyFatPercent !== undefined ||
    reading.muscleMassKg !== undefined ||
    reading.bodyWaterPercent !== undefined ||
    reading.visceralFatRating !== undefined ||
    reading.boneMassKg !== undefined
  )
}

export function parseZeppBodyCompositionText(
  text: string,
  asOfDate: string,
): ZeppBodyCompositionReading {
  const reading: ZeppBodyCompositionReading = {}
  const normalized = text.replace(/\u00a0/g, ' ')
  const lines = normalized
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  fillFromLabeledLines(lines, reading)
  fillFromUnlabeledFallback(normalized, reading)

  const date = parseScreenshotDate(normalized, asOfDate)
  if (date) reading.date = date
  return reading
}
