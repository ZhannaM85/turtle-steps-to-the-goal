/**
 * #1098 — turn Capgo HealthKit sample lists into per-day readings that
 * `applyHealthConnectDayReadings` can upsert (same shape as Android HC).
 */

export type AppleHealthWeightSample = {
  startDate: string
  value: number
}

export type AppleHealthSleepSample = {
  startDate: string
  endDate: string
  value: number
  sleepState?: string
}

export type AppleHealthDayReading = {
  date: string
  weightKg?: number
  sleepHours?: number
  deepSleepHours?: number
  /** #1104 — daily step total from HealthKit. */
  steps?: number
  /** #1099 — true when HealthKit had a non-None menstrual flow that day. */
  onPeriod?: boolean
}

export type AppleHealthStepsSample = {
  startDate: string
  value: number
  /** Capgo / HealthKit source — used for dominant-source pick (#1106 / #385). */
  sourceName?: string
  sourceId?: string
}

/** Sleep stages that count toward total sleep hours (excludes in-bed / awake). */
const ASLEEP_STATES = new Set(['asleep', 'deep', 'rem', 'light'])

function localDateKey(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Latest body-mass sample per local calendar day. Expects samples newest-first
 * (Capgo `ascending: false`); first sighting of a day wins.
 */
export function aggregateWeightByDay(
  samples: AppleHealthWeightSample[],
): { date: string; weightKg: number }[] {
  const byDay = new Map<string, number>()
  for (const sample of samples) {
    if (!Number.isFinite(sample.value) || sample.value <= 0) continue
    const date = localDateKey(sample.startDate)
    if (byDay.has(date)) continue
    byDay.set(date, sample.value)
  }
  return [...byDay.entries()].map(([date, weightKg]) => ({ date, weightKg }))
}

type SleepInterval = { start: number; end: number }

/** Union of clock intervals so Watch stages and another app's asleep
 * block for the same night are not added together (#1110). */
function mergeSleepIntervals(intervals: SleepInterval[]): SleepInterval[] {
  const sorted = [...intervals].sort(
    (a, b) => a.start - b.start || a.end - b.end,
  )
  const merged: SleepInterval[] = []
  for (const interval of sorted) {
    const last = merged[merged.length - 1]
    if (last && interval.start <= last.end) {
      last.end = Math.max(last.end, interval.end)
    } else {
      merged.push({ start: interval.start, end: interval.end })
    }
  }
  return merged
}

/**
 * Sleep attributed to the **wake-up** local day (interval end), matching
 * Android Health Connect (#658). Overlapping asleep samples — a second
 * source, or a coarse asleep block plus stages — count once (#1110).
 * Capgo reports duration in **minutes**; the clock span is what gets merged.
 */
export function aggregateSleepByWakeDay(
  samples: AppleHealthSleepSample[],
): { date: string; sleepHours: number; deepSleepHours?: number }[] {
  const sleepIntervals: SleepInterval[] = []
  const deepIntervals: SleepInterval[] = []
  for (const sample of samples) {
    const state = (sample.sleepState ?? 'asleep').toLowerCase()
    if (!ASLEEP_STATES.has(state)) continue
    if (!Number.isFinite(sample.value) || sample.value <= 0) continue
    const start = new Date(sample.startDate).getTime()
    const end = new Date(sample.endDate).getTime()
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue
    const interval = { start, end }
    sleepIntervals.push(interval)
    if (state === 'deep') deepIntervals.push(interval)
  }

  const byDay = new Map<string, { sleepMin: number; deepMin: number }>()
  const addMerged = (
    intervals: SleepInterval[],
    field: 'sleepMin' | 'deepMin',
  ) => {
    for (const interval of mergeSleepIntervals(intervals)) {
      const date = localDateKey(new Date(interval.end).toISOString())
      const prev = byDay.get(date) ?? { sleepMin: 0, deepMin: 0 }
      prev[field] += (interval.end - interval.start) / 60_000
      byDay.set(date, prev)
    }
  }
  addMerged(sleepIntervals, 'sleepMin')
  addMerged(deepIntervals, 'deepMin')

  return [...byDay.entries()].map(([date, { sleepMin, deepMin }]) => {
    const sleepHours = Math.round((sleepMin / 60) * 100) / 100
    const deepSleepHours =
      deepMin > 0 ? Math.round((deepMin / 60) * 100) / 100 : undefined
    return {
      date,
      sleepHours,
      ...(deepSleepHours !== undefined ? { deepSleepHours } : {}),
    }
  })
}

/**
 * #1104 / #1106 — map Capgo `queryAggregated` day buckets (HealthKit
 * cumulativeSum with OS dedupe) onto local calendar dates.
 */
export function mapAggregatedStepBuckets(
  samples: { startDate: string; value: number }[],
): { date: string; steps: number }[] {
  return samples
    .map((sample) => ({
      date: localDateKey(sample.startDate),
      steps: Math.round(sample.value),
    }))
    .filter((row) => Number.isFinite(row.steps) && row.steps > 0)
}

/**
 * Fallback when only raw samples are available: sum per source per local
 * day, then keep the **dominant** (highest) source — same as XML import #385.
 * Do not sum across phone + watch (that double-counts vs Apple Health UI).
 */
export function aggregateStepsByDay(
  samples: AppleHealthStepsSample[],
): { date: string; steps: number }[] {
  const byDay = new Map<string, Map<string, number>>()
  for (const sample of samples) {
    if (!Number.isFinite(sample.value) || sample.value <= 0) continue
    const date = localDateKey(sample.startDate)
    const source = sample.sourceId ?? sample.sourceName ?? '__unknown__'
    const sources = byDay.get(date) ?? new Map<string, number>()
    sources.set(source, (sources.get(source) ?? 0) + sample.value)
    byDay.set(date, sources)
  }
  return [...byDay.entries()]
    .map(([date, sources]) => {
      let max = 0
      for (const total of sources.values()) {
        if (total > max) max = total
      }
      return { date, steps: Math.round(max) }
    })
    .filter((row) => row.steps > 0)
}

export function mergeAppleHealthDayReadings(parts: {
  weights?: { date: string; weightKg: number }[]
  sleep?: { date: string; sleepHours: number; deepSleepHours?: number }[]
  steps?: { date: string; steps: number }[]
  periodDates?: string[]
}): AppleHealthDayReading[] {
  const byDate = new Map<string, AppleHealthDayReading>()
  for (const { date, weightKg } of parts.weights ?? []) {
    byDate.set(date, { ...byDate.get(date), date, weightKg })
  }
  for (const { date, sleepHours, deepSleepHours } of parts.sleep ?? []) {
    byDate.set(date, {
      ...byDate.get(date),
      date,
      sleepHours,
      ...(deepSleepHours !== undefined ? { deepSleepHours } : {}),
    })
  }
  for (const { date, steps } of parts.steps ?? []) {
    byDate.set(date, { ...byDate.get(date), date, steps })
  }
  for (const date of parts.periodDates ?? []) {
    byDate.set(date, { ...byDate.get(date), date, onPeriod: true })
  }
  return [...byDate.values()]
}
