import type { DailyEntry } from '@/domain/dailyEntry'
import {
  type DailyEntryPatch,
  mergeDailyEntryPatches,
} from '@/features/export/mergeDailyEntryPatches'

export type HealthConnectWeightReading = {
  date: string
  weightKg: number
}

/** Default window for Settings Sync (#694) — includes today + recent past. */
export const HEALTH_CONNECT_RECENT_DAYS = 7

/**
 * #693 / #694 — Health Connect Settings Sync is an explicit user action, so
 * weight from HC always replaces local weight for each day in the patch
 * (`overwrite`). File imports (Zepp / Apple Health / MFP) stay on #496
 * `fillGaps` by default; only this on-demand Sync button opts into refresh.
 */
export function applyHealthConnectWeight(
  date: string,
  weightKg: number,
  existing: DailyEntry | undefined,
): DailyEntry {
  return applyHealthConnectWeights([{ date, weightKg }], existing ? [existing] : [])[0]!
}

/**
 * #694 — apply several day readings (latest per date from HC) with overwrite.
 */
export function applyHealthConnectWeights(
  readings: HealthConnectWeightReading[],
  existingEntries: DailyEntry[],
): DailyEntry[] {
  if (readings.length === 0) return []
  const patches = new Map<string, DailyEntryPatch>()
  for (const { date, weightKg } of readings) {
    patches.set(date, { weightKg })
  }
  const { entriesToUpsert } = mergeDailyEntryPatches(
    patches,
    existingEntries,
    'overwrite',
  )
  return entriesToUpsert
}
