import type { DailyEntry } from '@/domain/dailyEntry'
import {
  type DailyEntryPatch,
  mergeDailyEntryPatches,
} from '@/features/export/mergeDailyEntryPatches'

/**
 * #693 — Health Connect Settings Sync is an explicit user action, so weight
 * from HC always replaces today's local weight (`overwrite`). File imports
 * (Zepp / Apple Health / MFP) stay on #496 `fillGaps` by default; only this
 * on-demand Sync button opts into refresh.
 */
export function applyHealthConnectWeight(
  date: string,
  weightKg: number,
  existing: DailyEntry | undefined,
): DailyEntry {
  const patch: DailyEntryPatch = { weightKg }
  const { entriesToUpsert } = mergeDailyEntryPatches(
    new Map([[date, patch]]),
    existing ? [existing] : [],
    'overwrite',
  )
  return entriesToUpsert[0]!
}
