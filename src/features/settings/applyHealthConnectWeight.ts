import type { DailyEntry } from '@/domain/dailyEntry'
import {
  type DailyEntryPatch,
  mergeDailyEntryPatches,
} from '@/features/export/mergeDailyEntryPatches'

export type HealthConnectDayReading = {
  date: string
  weightKg?: number
  steps?: number
  sleepHours?: number
  deepSleepHours?: number
}

/** @deprecated Prefer HealthConnectDayReading — kept for call-site clarity. */
export type HealthConnectWeightReading = HealthConnectDayReading

/** Default window for Settings Sync (#694 / #657 / #658). */
export const HEALTH_CONNECT_RECENT_DAYS = 7

/**
 * #693 / #694 / #657 / #658 — Health Connect Settings Sync is an explicit
 * user action, so values from HC replace local fields (`overwrite`). File
 * imports stay on #496 `fillGaps` by default.
 */
export function applyHealthConnectWeight(
  date: string,
  weightKg: number,
  existing: DailyEntry | undefined,
): DailyEntry {
  return applyHealthConnectDayReadings([{ date, weightKg }], existing ? [existing] : [])[0]!
}

/**
 * #694 / #657 / #658 — apply several day readings with overwrite.
 */
export function applyHealthConnectWeights(
  readings: HealthConnectDayReading[],
  existingEntries: DailyEntry[],
): DailyEntry[] {
  return applyHealthConnectDayReadings(readings, existingEntries)
}

export function applyHealthConnectDayReadings(
  readings: HealthConnectDayReading[],
  existingEntries: DailyEntry[],
): DailyEntry[] {
  if (readings.length === 0) return []
  const patches = new Map<string, DailyEntryPatch>()
  for (const reading of readings) {
    const patch: DailyEntryPatch = {}
    if (reading.weightKg !== undefined) patch.weightKg = reading.weightKg
    if (reading.steps !== undefined) patch.steps = reading.steps
    if (reading.sleepHours !== undefined) patch.sleepHours = reading.sleepHours
    if (reading.deepSleepHours !== undefined) {
      patch.deepSleepHours = reading.deepSleepHours
    }
    if (Object.keys(patch).length === 0) continue
    const prior = patches.get(reading.date) ?? {}
    patches.set(reading.date, { ...prior, ...patch })
  }
  if (patches.size === 0) return []
  const { entriesToUpsert } = mergeDailyEntryPatches(
    patches,
    existingEntries,
    'overwrite',
  )
  return entriesToUpsert
}

/** Merge separate native arrays into one reading list. */
export function mergeHealthConnectNativeReadings(
  weights: { date: string; weightKg: number }[],
  steps: { date: string; steps: number }[],
  sleep: { date: string; sleepHours: number; deepSleepHours?: number }[] = [],
): HealthConnectDayReading[] {
  const byDate = new Map<string, HealthConnectDayReading>()
  for (const { date, weightKg } of weights) {
    byDate.set(date, { ...byDate.get(date), date, weightKg })
  }
  for (const { date, steps: stepCount } of steps) {
    byDate.set(date, { ...byDate.get(date), date, steps: stepCount })
  }
  for (const { date, sleepHours, deepSleepHours } of sleep) {
    byDate.set(date, {
      ...byDate.get(date),
      date,
      sleepHours,
      ...(deepSleepHours !== undefined ? { deepSleepHours } : {}),
    })
  }
  return [...byDate.values()]
}
