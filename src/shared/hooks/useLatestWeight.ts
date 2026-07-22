import { useEffect, useState } from 'react'
import { IndexedDbDailyEntryRepository } from '@/infrastructure/persistence/indexeddb'

const dailyEntryRepository = new IndexedDbDailyEntryRepository()

/**
 * The most recently logged `weightKg` across all entries (by date, not
 * necessarily today's) — #259's "Suggest a target" TDEE helper needs a
 * current weight to compute BMR from, same "direct repository, no shared
 * store" pattern as `useMaxRecordedWeight` above. `refreshKey` should
 * change whenever a new weight might have been logged, so this re-scans.
 */
export function useLatestWeight(refreshKey: unknown): number | null {
  const [latestWeightKg, setLatestWeightKg] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    dailyEntryRepository
      .getAll()
      .then((entries) => {
        if (cancelled) return
        const withWeight = entries.filter(
          (entry): entry is typeof entry & { weightKg: number } =>
            entry.weightKg !== undefined,
        )
        if (withWeight.length === 0) {
          setLatestWeightKg(null)
          return
        }
        const latest = withWeight.reduce((a, b) => (a.date > b.date ? a : b))
        setLatestWeightKg(latest.weightKg)
      })
      .catch(() => {
        // No suggested-target helper is a minor cosmetic loss, not worth
        // surfacing as an error state — same precedent as
        // usePreviousDayEntry/useMaxRecordedWeight.
      })
    return () => {
      cancelled = true
    }
  }, [refreshKey])

  return latestWeightKg
}
