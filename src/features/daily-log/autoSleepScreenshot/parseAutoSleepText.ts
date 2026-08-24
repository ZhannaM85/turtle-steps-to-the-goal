/**
 * #748 — map OCR text from an AutoSleep Today screenshot onto sleep +
 * deep sleep. Pure string parsing so tests can use text fixtures (this
 * repo is public — do not commit real photos).
 */

export interface AutoSleepReading {
  sleepHours?: number
  deepSleepHours?: number
  /** ISO `YYYY-MM-DD` of the wake morning (`SUNDAY 16 → MONDAY 17` → 17). */
  date?: string
}

const DURATION_RE =
  /(\d{1,2})\s*h(?:ou?rs?)?\s*(\d{1,2})\s*m(?:in(?:utes?)?)?/gi

const SKIP_LINE_RE =
  /quality|in\s*bed|time\s*in\s*bed|efficiency|awake|heart\s*rate|\bbpm\b|rating|heartrate|\bavg\b|average/i

const WEEKDAY =
  'sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat'

const RANGE_RE = new RegExp(
  `(?:${WEEKDAY})\\s+(\\d{1,2})\\s*[→\\-–]\\s*(?:${WEEKDAY})\\s+(\\d{1,2})`,
  'i',
)

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
}

/** History header: "Sun Aug 23, 2026" (#758). */
const HISTORY_DATE_RE = new RegExp(
  `(?:${WEEKDAY})\\s+(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)\\.?\\s+(\\d{1,2}),?\\s+(\\d{4})`,
  'i',
)

const CLOCK_DURATION_RE = /\b(\d{1,2}):(\d{2})\b/g

function roundHours(value: number): number {
  return Math.round(value * 100) / 100
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

function parseWakeDate(text: string, asOfDate: string): string | undefined {
  const history = HISTORY_DATE_RE.exec(text)
  if (history) {
    const month = MONTHS[history[1]!.toLowerCase()]
    const day = Number(history[2])
    const year = Number(history[3])
    if (month && Number.isFinite(day) && Number.isFinite(year)) {
      return isoDate(year, month, day)
    }
  }
  const match = RANGE_RE.exec(text)
  if (!match) return undefined
  const wakeDay = Number(match[2])
  if (!Number.isFinite(wakeDay)) return undefined
  const asOfYear = Number(asOfDate.slice(0, 4))
  const asOfMonth = Number(asOfDate.slice(5, 7))
  return isoDate(asOfYear, asOfMonth, wakeDay)
}

function durationsOn(line: string): number[] {
  const found: number[] = []
  DURATION_RE.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = DURATION_RE.exec(line)) !== null) {
    const hours = Number(match[1])
    const minutes = Number(match[2])
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) continue
    if (minutes >= 60) continue
    const value = roundHours(hours + minutes / 60)
    if (value < 0.25 || value > 16) continue
    found.push(value)
  }
  return found
}

/** History tiles use `5:10` / `1:48`, not `5h 10m` (#758). */
function clockDurationsOn(line: string): number[] {
  const found: number[] = []
  CLOCK_DURATION_RE.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = CLOCK_DURATION_RE.exec(line)) !== null) {
    const hours = Number(match[1])
    const minutes = Number(match[2])
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) continue
    if (minutes >= 60) continue
    const value = roundHours(hours + minutes / 60)
    if (value < 0.25 || value > 16) continue
    found.push(value)
  }
  return found
}

function historyTileKind(line: string): 'deep' | 'asleep' | null {
  if (/deep/i.test(line)) return 'deep'
  if (/\basleep\b/i.test(line)) return 'asleep'
  return null
}

export function hasAutoSleepValues(reading: AutoSleepReading): boolean {
  return reading.sleepHours !== undefined || reading.deepSleepHours !== undefined
}

export function parseAutoSleepText(
  text: string,
  asOfDate: string,
): AutoSleepReading {
  const reading: AutoSleepReading = {}
  const lines = text
    .replace(/\u00a0/g, ' ')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  const kept: { line: string; hours: number }[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    if (SKIP_LINE_RE.test(line)) continue
    const hours = durationsOn(line)
    const tile = historyTileKind(line)
    if (tile) {
      hours.push(...clockDurationsOn(line))
      if (hours.length === 0 && lines[i + 1]) {
        hours.push(...clockDurationsOn(lines[i + 1]!))
      }
    }
    for (const value of hours) {
      kept.push({ line, hours: value })
    }
  }

  const deep = kept.find((item) => /deep/i.test(item.line))
  if (deep) reading.deepSleepHours = deep.hours

  const labeledSleep = kept.find(
    (item) =>
      /(?:^|\b)(?:sleep|asleep|today)(?:\b|$)/i.test(item.line) &&
      !/deep/i.test(item.line),
  )
  if (labeledSleep) reading.sleepHours = labeledSleep.hours

  if (reading.sleepHours === undefined) {
    const remaining = kept
      .map((item) => item.hours)
      .filter((hours) => hours !== reading.deepSleepHours)
    if (remaining.length > 0) {
      reading.sleepHours = Math.max(...remaining)
    }
  }

  if (reading.deepSleepHours === undefined && reading.sleepHours !== undefined) {
    const smaller = kept
      .map((item) => item.hours)
      .filter((hours) => hours < reading.sleepHours!)
    if (smaller.length > 0) {
      reading.deepSleepHours = Math.min(...smaller)
    }
  }

  const date = parseWakeDate(text.replace(/\u00a0/g, ' '), asOfDate)
  if (date) reading.date = date
  return reading
}
