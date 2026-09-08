import { useEffect, useState } from 'react'
import { addDays, format, parseISO } from 'date-fns'
import type { DailyEntry } from '@/domain/dailyEntry'
import { IndexedDbDailyEntryRepository } from '@/infrastructure/persistence/indexeddb'
import { useDailyEntryStore } from '@/stores'

const dailyEntryRepository = new IndexedDbDailyEntryRepository()

const DATE_FORMAT = 'yyyy-MM-dd'

/**
 * The entry from the calendar day immediately after `date` (#829).
 * Re-fetches when Today saves so editing tomorrow’s weight refreshes
 * yesterday’s Next Morning Weight card after navigating back.
 */
export function useNextDayEntry(date: string): DailyEntry | null {
  const [entry, setEntry] = useState<DailyEntry | null>(null)
  const savedEntry = useDailyEntryStore((state) => state.entry)

  useEffect(() => {
    let cancelled = false
    const nextDate = format(addDays(parseISO(date), 1), DATE_FORMAT)
    dailyEntryRepository
      .getByDate(nextDate)
      .then((result) => {
        if (!cancelled) setEntry(result ?? null)
      })
      .catch(() => {
        if (!cancelled) setEntry(null)
      })
    return () => {
      cancelled = true
    }
  }, [date, savedEntry])

  return entry
}
