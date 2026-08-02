import { addDays, format, parseISO } from 'date-fns'
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
  /** #385 — which device/app logged this record (e.g. "iPhone", "My Watch").
   * Only currently read for StepCount dedup (see AppleHealthPatchBuilder's
   * own comment) — every other record type still ignores it. */
  sourceName?: string
}

// #411 — matches both the self-closing `<Record .../>` shape (the only one
// originally handled) and the paired `<Record ...>...</Record>` shape Apple
// Health actually writes whenever a record carries `<MetadataEntry>`
// children (e.g. `HKWasUserEntered`, or `HKMetadataKeyMenstrualCycleStart`
// on a manually-logged MenstrualFlow record) — the self-closing-only regex
// silently dropped every one of these, with no error. Root cause of period
// days genuinely present in a real export not appearing after import.
const RECORD_TAG_RE = /<Record\b([^>]*?)(?:\/>|>[\s\S]*?<\/Record>)/g
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
    sourceName: attrs.sourceName,
  }
}

// A generous margin — comfortably longer than any real `<Record .../>` tag
// (even one with a verbose escaped `device` attribute) — so re-scanning
// never skips past a tag that's genuinely still incomplete at the buffer's
// current tail.
const TAG_SAFETY_MARGIN = 4096

/**
 * Incrementally extracts `<Record>` elements (both the self-closing
 * `<Record .../>` shape and the paired `<Record ...>...</Record>` shape
 * used whenever a record has `<MetadataEntry>` children, #411) out of
 * chunks of Apple Health's `export.xml`, fed in whatever size the
 * decompressor happens to hand back. Never holds more than "text since the
 * last complete match" in its internal buffer — a tag split across two
 * chunk boundaries (likely at some point in a 1GB+ file streamed in small
 * pieces) is simply completed once its closing tag arrives in a later
 * chunk, rather than requiring the whole file in memory at once. `Record`
 * elements themselves don't nest (per the export's own DTD, one nested
 * inside a `Correlation` also appears flat at the top level) — only their
 * own `MetadataEntry` children can appear between an opening and closing
 * `Record` tag, so a non-nesting-aware "first `</Record>` closes it" match
 * is still a complete, correct view of every record.
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
  sleepAnalysis: 'HKCategoryTypeIdentifierSleepAnalysis',
  // #411 — another Category-type record, same shape as sleepAnalysis: no
  // numeric `value`, just a flow-level identifier string.
  menstrualFlow: 'HKCategoryTypeIdentifierMenstrualFlow',
} as const

// #411 — the one flow-level value that means "no flow," i.e. doesn't
// itself mark the day as a period day. Every other value (Light/Medium/
// Heavy/Unspecified) does. From public HealthKit documentation, not yet
// confirmed against a real export the same way #366's other field
// mappings originally were.
const MENSTRUAL_FLOW_NONE_VALUE = 'HKCategoryValueMenstrualFlowNone'

// #368 — a Category-type record's "amount" is its own startDate/endDate
// interval, not a numeric `value` the way every Quantity type above is —
// `value` is instead one of these stage identifiers. `AsleepUnspecified`
// replaced the older, unqualified `Asleep` in iOS 16; both can appear
// depending on the OS version active when a given record was written, so
// both count. `InBed` alone (no Asleep* record covering the same night)
// is the only signal a pre-stage-tracking source ever wrote — used as a
// fallback, not summed alongside real sleep stages. `Awake` intentionally
// contributes to neither total.
const SLEEP_ASLEEP_VALUES = new Set([
  'HKCategoryValueSleepAnalysisAsleep',
  'HKCategoryValueSleepAnalysisAsleepUnspecified',
  'HKCategoryValueSleepAnalysisAsleepCore',
  'HKCategoryValueSleepAnalysisAsleepDeep',
  'HKCategoryValueSleepAnalysisAsleepREM',
])
const SLEEP_DEEP_VALUE = 'HKCategoryValueSleepAnalysisAsleepDeep'
const SLEEP_IN_BED_VALUE = 'HKCategoryValueSleepAnalysisInBed'

interface SleepInterval {
  startMs: number
  endMs: number
}

/** Per-(wake date, source) accumulator — raw intervals, not running sums.
 * #525: HealthKit often writes overlapping samples for the same night;
 * seconds are derived via `unionIntervalSeconds` at merge/build time. */
interface SleepBucket {
  asleep: SleepInterval[]
  deep: SleepInterval[]
  inBed: SleepInterval[]
}

// #412 — reported live: deep sleep specifically missing for a night whose
// *total* sleep imported correctly. Root cause: each sleep record is
// bucketed by its own `end.localDate`, but a night's first segment can
// itself end *before* midnight (e.g. falling asleep at 22:30, the first
// Core/Deep segment ending at 23:15) — deep sleep in particular
// concentrates in the first sleep cycle of the night, making it the
// segment most likely to both start and end pre-midnight. That segment's
// seconds silently land in the *previous* calendar day's bucket instead of
// the night's actual wake date, even though the class-level intent
// ("keyed by the wake date") assumes every segment of one continuous night
// ends after midnight. A real two-nights-apart gap is always many hours
// (an entire waking day); a same-session split by this bug is always a
// small gap between one bucket's last end and the very next calendar
// day's first start, which is what this threshold distinguishes.
const SLEEP_SESSION_MERGE_GAP_MS = 4 * 60 * 60 * 1000

// #525 — the ≤4h gap alone also chained polyphasic/illness days (naps every
// few hours) into one wake date totaling 48h+. Only fold the previous
// calendar day when it holds a *small* leftover fragment (typical
// pre-midnight deep/core piece), not a full day's worth of sleep.
const SLEEP_MIDNIGHT_FRAGMENT_MAX_SECONDS = 4 * 60 * 60

/** Same ceiling as `sleepHoursSchema` / the daily form — import must not
 * write values the UI itself refuses. */
const MAX_IMPORTED_SLEEP_HOURS = 24

/** Covered duration of possibly-overlapping intervals (union), in seconds. */
export function unionIntervalSeconds(intervals: SleepInterval[]): number {
  if (intervals.length === 0) return 0
  const sorted = [...intervals].sort((a, b) => a.startMs - b.startMs)
  let totalMs = 0
  let curStart = sorted[0].startMs
  let curEnd = sorted[0].endMs
  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i]
    if (next.startMs <= curEnd) {
      curEnd = Math.max(curEnd, next.endMs)
    } else {
      totalMs += curEnd - curStart
      curStart = next.startMs
      curEnd = next.endMs
    }
  }
  totalMs += curEnd - curStart
  return totalMs / 1000
}

function sleepBucketSpan(bucket: SleepBucket): {
  firstStartMs: number
  lastEndMs: number
  asleepSeconds: number
  deepSeconds: number
  inBedSeconds: number
} | null {
  const intervals = [...bucket.asleep, ...bucket.inBed]
  if (intervals.length === 0) return null
  let firstStartMs = intervals[0].startMs
  let lastEndMs = intervals[0].endMs
  for (const iv of intervals) {
    if (iv.startMs < firstStartMs) firstStartMs = iv.startMs
    if (iv.endMs > lastEndMs) lastEndMs = iv.endMs
  }
  return {
    firstStartMs,
    lastEndMs,
    asleepSeconds: unionIntervalSeconds(bucket.asleep),
    deepSeconds: unionIntervalSeconds(bucket.deep),
    inBedSeconds: unionIntervalSeconds(bucket.inBed),
  }
}

function sleepHoursFromBucket(bucket: SleepBucket): number {
  const span = sleepBucketSpan(bucket)
  if (!span) return 0
  return (span.asleepSeconds || span.inBedSeconds) / 3600
}

interface LatestValue {
  value: number
  epochMs: number
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

// #385 — bucket key for a StepCount record with no sourceName attribute at
// all (not expected in a real export, where it's always present, but kept
// as its own single bucket rather than silently merging into whichever
// named source happens to be seen first).
const UNKNOWN_STEP_SOURCE = '__unknown__'

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
  // #385 — keyed by date, then by sourceName: an iPhone and an Apple Watch
  // can each log their own overlapping StepCount records for the same real
  // walk, so summing every record regardless of source double-counts.
  // Best-effort fix (no real multi-source export to validate a true
  // interval-overlap merge against): per calendar date, `build()` below
  // keeps only the single source that logged the most steps that day and
  // discards the rest, rather than summing across sources. Within one
  // source, same-day intraday records still sum as before.
  private stepsByDateAndSource = new Map<string, Map<string, number>>()
  private waterEntriesByDate = new Map<string, WaterEntry[]>()
  // #368 — same per-(date, source) shape as stepsByDateAndSource above, and
  // for the identical reason: a phone/watch/third-party sleep app can each
  // write their own overlapping interval for the same real night, so a
  // dominant-source pick at build() time (not summing across sources)
  // avoids double-counting the same sleep twice. Keyed by the *wake* date
  // (the calendar day a night's final interval ends on) — matches how a
  // person would actually describe "how did I sleep", reviewed the
  // following morning, not the day they happened to fall asleep on.
  // #525 — stores raw intervals; covered duration is a union at build time.
  private sleepByDateAndSource = new Map<string, Map<string, SleepBucket>>()
  // #411 — dates with a real (non-"None") menstrual flow record. A date
  // with no record at all is simply left unset, same as this app's own
  // manual onPeriod toggle when never touched — there's no "confirmed not
  // on period" state modeled here, only "was a period day."
  private onPeriodDates = new Set<string>()

  addRecord(record: AppleHealthRecord): void {
    // #368 — a Category-type record (sleep) has no numeric `value` at all;
    // handle it before the Quantity-type numeric check below rejects it.
    if (record.type === HK_TYPE.sleepAnalysis) {
      this.addSleepRecord(record)
      return
    }
    if (record.type === HK_TYPE.menstrualFlow) {
      this.addMenstrualFlowRecord(record)
      return
    }
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
      case HK_TYPE.stepCount: {
        // Records are intraday chunks (one per detected walking burst), not
        // one per day — sum them, but only within the same source (#385);
        // see this.stepsByDateAndSource's own comment for why not across
        // sources.
        const source = record.sourceName ?? UNKNOWN_STEP_SOURCE
        const bySource =
          this.stepsByDateAndSource.get(localDate) ?? new Map<string, number>()
        bySource.set(source, (bySource.get(source) ?? 0) + numeric)
        this.stepsByDateAndSource.set(localDate, bySource)
        break
      }
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

  private addSleepRecord(record: AppleHealthRecord): void {
    if (record.value === undefined) return
    if (!record.startDate || !record.endDate) return
    const start = parseHealthTimestamp(record.startDate)
    const end = parseHealthTimestamp(record.endDate)
    if (!(end.epochMs > start.epochMs)) return
    const isAsleep = SLEEP_ASLEEP_VALUES.has(record.value)
    const isInBed = record.value === SLEEP_IN_BED_VALUE
    if (!isAsleep && !isInBed) return // e.g. Awake — contributes to neither total

    const source = record.sourceName ?? UNKNOWN_STEP_SOURCE
    const bySource =
      this.sleepByDateAndSource.get(end.localDate) ??
      new Map<string, SleepBucket>()
    const bucket = bySource.get(source) ?? {
      asleep: [],
      deep: [],
      inBed: [],
    }
    const interval: SleepInterval = {
      startMs: start.epochMs,
      endMs: end.epochMs,
    }
    if (isAsleep) {
      bucket.asleep.push(interval)
      if (record.value === SLEEP_DEEP_VALUE) bucket.deep.push(interval)
    } else {
      bucket.inBed.push(interval)
    }
    bySource.set(source, bucket)
    this.sleepByDateAndSource.set(end.localDate, bySource)
  }

  // #412 — folds a calendar day's sleep bucket forward into the *next*
  // day's bucket for the same source, when the gap between this bucket's
  // last end and the next day's first start is small enough that they're
  // almost certainly one continuous overnight session split only because
  // an early segment (often deep sleep) happened to end before midnight.
  // #525 — also requires the previous day to be a *small fragment* (not a
  // full day's sleep), so polyphasic/illness days with ≤4h gaps no longer
  // chain into one impossible total. Mutates `sleepByDateAndSource` in
  // place; called once from `build()` before the per-date dominant-source
  // pick below.
  private mergeSleepSessionsAcrossMidnight(): void {
    const dates = [...this.sleepByDateAndSource.keys()].sort()
    for (const date of dates) {
      const bySource = this.sleepByDateAndSource.get(date)
      if (!bySource) continue // already folded forward and removed below
      const nextDate = format(addDays(parseISO(date), 1), 'yyyy-MM-dd')
      const nextBySource = this.sleepByDateAndSource.get(nextDate)
      if (!nextBySource) continue
      for (const [source, bucket] of bySource) {
        const nextBucket = nextBySource.get(source)
        if (!nextBucket) continue
        const span = sleepBucketSpan(bucket)
        const nextSpan = sleepBucketSpan(nextBucket)
        if (!span || !nextSpan) continue
        const gapMs = nextSpan.firstStartMs - span.lastEndMs
        if (gapMs < 0 || gapMs > SLEEP_SESSION_MERGE_GAP_MS) continue
        const fragmentSeconds = span.asleepSeconds || span.inBedSeconds
        if (fragmentSeconds > SLEEP_MIDNIGHT_FRAGMENT_MAX_SECONDS) continue
        nextBucket.asleep.push(...bucket.asleep)
        nextBucket.deep.push(...bucket.deep)
        nextBucket.inBed.push(...bucket.inBed)
        bySource.delete(source)
      }
      if (bySource.size === 0) this.sleepByDateAndSource.delete(date)
    }
  }

  private addMenstrualFlowRecord(record: AppleHealthRecord): void {
    if (record.value === undefined) return
    if (record.value === MENSTRUAL_FLOW_NONE_VALUE) return
    const dateSource = record.startDate ?? record.creationDate
    if (!dateSource) return
    const { localDate } = parseHealthTimestamp(dateSource)
    this.onPeriodDates.add(localDate)
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
    for (const [date, bySource] of this.stepsByDateAndSource) {
      // #385 — the dominant (highest-total) source for this date only,
      // not the sum across all of them.
      let maxSteps = 0
      for (const total of bySource.values()) {
        if (total > maxSteps) maxSteps = total
      }
      patchFor(date).steps = maxSteps
    }
    for (const [date, entries] of this.waterEntriesByDate) {
      patchFor(date).waterEntries = entries
    }
    for (const date of this.onPeriodDates) {
      patchFor(date).onPeriod = true
    }
    this.mergeSleepSessionsAcrossMidnight()
    for (const [date, bySource] of this.sleepByDateAndSource) {
      // #368 — same dominant-source-per-night pick as steps above, not a
      // sum across sources (a phone and a watch can each log their own
      // overlapping interval for the same real sleep). Each source's own
      // total prefers real sleep-stage data (asleepSeconds) and only falls
      // back to inBedSeconds when that source recorded no Asleep* interval
      // at all that night (older, pre-stage-tracking data).
      //
      // #412 (reopened) — deep sleep is NOT tied to that same dominant
      // source. Third-party apps (e.g. AutoSleep) often win on total hours
      // via AsleepUnspecified but never write AsleepDeep into HealthKit;
      // the Watch writes real AsleepDeep stages for the same night with a
      // shorter total. Taking deep only from the dominant source then
      // drops deep to "—" while total sleep stays correct. Use the max
      // deepSeconds across sources for the night (never a sum — stages
      // from two devices would otherwise double-count).
      //
      // #525 — hours come from overlap-aware unions; hard-capped at 24.
      let bestHours = 0
      let bestDeepSeconds = 0
      let hasBest = false
      for (const bucket of bySource.values()) {
        const hours = sleepHoursFromBucket(bucket)
        if (hours > bestHours) {
          bestHours = hours
          hasBest = true
        }
        const deepSeconds = unionIntervalSeconds(bucket.deep)
        if (deepSeconds > bestDeepSeconds) {
          bestDeepSeconds = deepSeconds
        }
      }
      if (hasBest) {
        patchFor(date).sleepHours = round2(
          Math.min(bestHours, MAX_IMPORTED_SLEEP_HOURS),
        )
        if (bestDeepSeconds > 0) {
          patchFor(date).deepSleepHours = round2(
            Math.min(bestDeepSeconds / 3600, MAX_IMPORTED_SLEEP_HOURS),
          )
        }
      }
    }

    return patches
  }
}
