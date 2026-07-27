import type { WaterEntry } from '@/domain/dailyEntry'
import { parseHealthTimestamp } from '../parseHealthTimestamp'
import type { DailyEntryPatch } from '../mergeDailyEntryPatches'

export interface AppleHealthRecord {
  type: string
  unit?: string
  value?: string
  creationDate?: string
  startDate?: string
  endDate?: string
}

const RECORD_TAG_RE = /<Record\b([^>]*?)\/>/g
const ATTR_RE = /([\w:-]+)="([^"]*)"/g

function unescapeXmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
}

function parseRecordAttrs(tagAttrs: string): AppleHealthRecord | null {
  const attrs: Record<string, string> = {}
  ATTR_RE.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = ATTR_RE.exec(tagAttrs))) {
    attrs[match[1]] = unescapeXmlEntities(match[2])
  }
  if (!attrs.type) return null
  return {
    type: attrs.type,
    unit: attrs.unit,
    value: attrs.value,
    creationDate: attrs.creationDate,
    startDate: attrs.startDate,
    endDate: attrs.endDate,
  }
}

// A generous margin — comfortably longer than any real `<Record .../>` tag
// (even one with a verbose escaped `device` attribute) — so re-scanning
// never skips past a tag that's genuinely still incomplete at the buffer's
// current tail.
const TAG_SAFETY_MARGIN = 4096

/**
 * Incrementally extracts `<Record .../>` elements out of chunks of Apple
 * Health's `export.xml`, fed in whatever size the decompressor happens to
 * hand back. Never holds more than "text since the last complete match" in
 * its internal buffer — a tag split across two chunk boundaries (likely at
 * some point in a 1GB+ file streamed in small pieces) is simply completed
 * once its closing `/>` arrives in a later chunk, rather than requiring
 * the whole file in memory at once. Only self-closing `<Record/>` elements
 * are matched (per the export's own DTD, every `Record` — including ones
 * nested inside a `Correlation` — also appears flat at the top level, so
 * this alone is a complete, non-nesting-aware view of every record).
 *
 * Real exports have long stretches (e.g. inside a `<Workout>` block) with
 * no `<Record>` tags at all — during one of these, `this.buffer` is
 * actively kept bounded to roughly `TAG_SAFETY_MARGIN` bytes (everything
 * confirmed match-free is dropped for good, not just skipped-past),
 * rather than being allowed to grow for the whole stretch. Growing it
 * unbounded turned out to be a real O(n²) trap even when only *scanning*
 * from a remembered offset (not re-matching from byte 0): repeatedly
 * concatenating onto an ever-larger string and then regex-`exec`ing it
 * forces the engine to flatten the whole accumulated string on every call
 * — confirmed directly against a real ~1.3GB export.xml (a couple of
 * seconds once the buffer itself was kept small, vs. 25+ seconds for a
 * mere ~3MB synthetic no-match stretch when only the scan position, not
 * the buffer's actual size, was bounded).
 */
export class AppleHealthRecordScanner {
  private buffer = ''

  push(chunk: string): AppleHealthRecord[] {
    this.buffer += chunk
    const records: AppleHealthRecord[] = []
    RECORD_TAG_RE.lastIndex = 0
    let match: RegExpExecArray | null
    let consumedUpTo = 0
    while ((match = RECORD_TAG_RE.exec(this.buffer))) {
      const record = parseRecordAttrs(match[1])
      if (record) records.push(record)
      consumedUpTo = RECORD_TAG_RE.lastIndex
    }
    if (consumedUpTo > 0) {
      this.buffer = this.buffer.slice(consumedUpTo)
    } else if (this.buffer.length > TAG_SAFETY_MARGIN) {
      this.buffer = this.buffer.slice(this.buffer.length - TAG_SAFETY_MARGIN)
    }
    return records
  }
}

const HK_TYPE = {
  bodyMass: 'HKQuantityTypeIdentifierBodyMass',
  bodyFatPercentage: 'HKQuantityTypeIdentifierBodyFatPercentage',
  waistCircumference: 'HKQuantityTypeIdentifierWaistCircumference',
  stepCount: 'HKQuantityTypeIdentifierStepCount',
  dietaryWater: 'HKQuantityTypeIdentifierDietaryWater',
} as const

interface LatestValue {
  value: number
  epochMs: number
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * Folds a stream of `AppleHealthRecord`s into one `DailyEntryPatch` per
 * calendar date — the accumulators here (not the raw records) are what
 * stays in memory for the whole import, since there are vastly fewer
 * distinct dates than records in a real export.
 */
export class AppleHealthPatchBuilder {
  private latestWeightByDate = new Map<string, LatestValue>()
  private latestBodyFatByDate = new Map<string, LatestValue>()
  private latestWaistByDate = new Map<string, LatestValue>()
  private stepsByDate = new Map<string, number>()
  private waterEntriesByDate = new Map<string, WaterEntry[]>()

  addRecord(record: AppleHealthRecord): void {
    if (record.value === undefined) return
    const numeric = Number(record.value)
    if (!Number.isFinite(numeric)) return
    const dateSource = record.startDate ?? record.creationDate
    if (!dateSource) return
    const { localDate, epochMs } = parseHealthTimestamp(dateSource)

    switch (record.type) {
      case HK_TYPE.bodyMass:
        this.setIfLatest(this.latestWeightByDate, localDate, numeric, epochMs)
        break
      case HK_TYPE.bodyFatPercentage:
        // HealthKit stores this as a 0-1 fraction despite unit="%" (a real,
        // confirmed quirk — 0.274 for ~27.4% in a real sample record).
        this.setIfLatest(
          this.latestBodyFatByDate,
          localDate,
          round2(numeric * 100),
          epochMs,
        )
        break
      case HK_TYPE.waistCircumference:
        // Trust each record's own reported unit rather than assuming —
        // unlike Zepp's bare CSV numbers, HealthKit records self-describe
        // their unit, so there's no need to guess.
        if (record.unit === 'cm') {
          this.setIfLatest(this.latestWaistByDate, localDate, numeric, epochMs)
        }
        break
      case HK_TYPE.stepCount:
        // Records are intraday chunks (one per detected walking burst),
        // not one per day — sum them.
        this.stepsByDate.set(
          localDate,
          (this.stepsByDate.get(localDate) ?? 0) + numeric,
        )
        break
      case HK_TYPE.dietaryWater: {
        const entries = this.waterEntriesByDate.get(localDate) ?? []
        entries.push({ id: crypto.randomUUID(), amountMl: numeric })
        this.waterEntriesByDate.set(localDate, entries)
        break
      }
      default:
        break
    }
  }

  private setIfLatest(
    map: Map<string, LatestValue>,
    date: string,
    value: number,
    epochMs: number,
  ): void {
    const existing = map.get(date)
    if (!existing || epochMs > existing.epochMs) {
      map.set(date, { value, epochMs })
    }
  }

  build(): Map<string, DailyEntryPatch> {
    const patches = new Map<string, DailyEntryPatch>()
    const patchFor = (date: string): DailyEntryPatch => {
      let patch = patches.get(date)
      if (!patch) {
        patch = {}
        patches.set(date, patch)
      }
      return patch
    }

    for (const [date, { value }] of this.latestWeightByDate) {
      patchFor(date).weightKg = value
    }
    for (const [date, { value }] of this.latestBodyFatByDate) {
      patchFor(date).bodyFatPercent = value
    }
    for (const [date, { value }] of this.latestWaistByDate) {
      patchFor(date).waistCm = value
    }
    for (const [date, steps] of this.stepsByDate) {
      patchFor(date).steps = steps
    }
    for (const [date, entries] of this.waterEntriesByDate) {
      patchFor(date).waterEntries = entries
    }

    return patches
  }
}
