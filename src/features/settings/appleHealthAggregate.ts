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

/**
 * Sleep attributed to the **wake-up** local day (sample `endDate`), matching
 * Android Health Connect (#658). Capgo reports duration in **minutes**.
 */
export function aggregateSleepByWakeDay(
  samples: AppleHealthSleepSample[],
): { date: string; sleepHours: number; deepSleepHours?: number }[] {
  const byDay = new Map<string, { sleepMin: number; deepMin: number }>()
  for (const sample of samples) {
    const state = (sample.sleepState ?? 'asleep').toLowerCase()
    if (!ASLEEP_STATES.has(state)) continue
    if (!Number.isFinite(sample.value) || sample.value <= 0) continue
    const date = localDateKey(sample.endDate)
    const prev = byDay.get(date) ?? { sleepMin: 0, deepMin: 0 }
    prev.sleepMin += sample.value
    if (state === 'deep') prev.deepMin += sample.value
    byDay.set(date, prev)
  }
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
 * #1104 — sum step-count samples onto the sample's local start day
 * (matches Android Health Connect #657).
 */
export function aggregateStepsByDay(
  samples: AppleHealthStepsSample[],
): { date: string; steps: number }[] {
  const byDay = new Map<string, number>()
  for (const sample of samples) {
    if (!Number.isFinite(sample.value) || sample.value <= 0) continue
    const date = localDateKey(sample.startDate)
    byDay.set(date, (byDay.get(date) ?? 0) + sample.value)
  }
  return [...byDay.entries()]
    .map(([date, total]) => ({ date, steps: Math.round(total) }))
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
