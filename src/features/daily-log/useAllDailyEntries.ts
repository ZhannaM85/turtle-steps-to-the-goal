import { useEffect, useState } from 'react'
import type { DailyEntry } from '@/domain/dailyEntry'
import { IndexedDbDailyEntryRepository } from '@/infrastructure/persistence/indexeddb'

const dailyEntryRepository = new IndexedDbDailyEntryRepository()

/** Every saved day. `refreshKey` should change when a day is saved. */
export function useAllDailyEntries(refreshKey: unknown): DailyEntry[] {
  const [entries, setEntries] = useState<DailyEntry[]>([])

  useEffect(() => {
    let cancelled = false
    dailyEntryRepository
      .getAll()
      .then((all) => {
        if (!cancelled) setEntries(all)
      })
      .catch(() => {
        // The day page still works without the optional summaries.
      })
    return () => {
      cancelled = true
    }
  }, [refreshKey])

  return entries
}
