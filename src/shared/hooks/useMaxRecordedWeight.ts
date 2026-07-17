import { useEffect, useState } from 'react'
import { IndexedDbDailyEntryRepository } from '@/infrastructure/persistence/indexeddb'

const dailyEntryRepository = new IndexedDbDailyEntryRepository()

/**
 * The highest `weightKg` ever logged across all entries, for the
 * progress-vs-peak-weight stat (#100). `refreshKey` should change whenever
 * a new weight might have been logged (e.g. the current day's entry) so
 * this re-scans — a freshly-logged all-time high wouldn't otherwise be
 * picked up until next mount.
 */
export function useMaxRecordedWeight(refreshKey: unknown): number | null {
  const [maxWeightKg, setMaxWeightKg] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    dailyEntryRepository
      .getAll()
      .then((entries) => {
        if (cancelled) return
        const weights = entries
          .map((entry) => entry.weightKg)
          .filter((weightKg): weightKg is number => weightKg !== undefined)
        setMaxWeightKg(weights.length > 0 ? Math.max(...weights) : null)
      })
      .catch(() => {
        // No max-weight stat is a minor cosmetic loss, not worth surfacing
        // as an error state — same precedent as usePreviousDayEntry.
      })
    return () => {
      cancelled = true
    }
  }, [refreshKey])

  return maxWeightKg
}
