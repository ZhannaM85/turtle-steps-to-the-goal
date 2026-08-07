import { useEffect } from 'react'
import { IndexedDbDailyEntryRepository } from '@/infrastructure/persistence/indexeddb'
import { useLastBackupStore } from '@/stores'

const dailyEntryRepository = new IndexedDbDailyEntryRepository()

/**
 * Backdates the JSON-backup reminder's `firstSeenAt` reference point to
 * the earliest logged `DailyEntry` date, if that's earlier than what's
 * currently stored (#599). See `lastBackupStore.ts` for why this needs to
 * run on mount rather than only at store creation.
 */
export function useSeedBackupFirstSeenAt(): void {
  const backdateFirstSeenAt = useLastBackupStore(
    (state) => state.backdateFirstSeenAt,
  )

  useEffect(() => {
    let cancelled = false
    dailyEntryRepository
      .getEarliestEntryDate()
      .then((date) => {
        if (cancelled || date === undefined) return
        backdateFirstSeenAt(new Date(date).toISOString())
      })
      .catch(() => {
        // Missing an earlier backdate just means the reminder counts from
        // whenever the store was first created — a minor cosmetic gap,
        // not worth surfacing as an error (same precedent as
        // useMaxRecordedWeight).
      })
    return () => {
      cancelled = true
    }
  }, [backdateFirstSeenAt])
}
