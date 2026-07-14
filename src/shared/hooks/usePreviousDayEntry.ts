import { useEffect, useState } from 'react'
import { format, parseISO, subDays } from 'date-fns'
import type { DailyEntry } from '@/domain/dailyEntry'
import { IndexedDbDailyEntryRepository } from '@/infrastructure/persistence/indexeddb'

const dailyEntryRepository = new IndexedDbDailyEntryRepository()

const DATE_FORMAT = 'yyyy-MM-dd'

/**
 * The entry from the calendar day immediately before `date`, for the
 * delta-vs-yesterday stat (#42) — a distinct, unsmoothed day-over-day
 * number, separate from the weekly average-vs-average delta in
 * weeklySummaries.ts.
 */
export function usePreviousDayEntry(date: string): DailyEntry | null {
  const [entry, setEntry] = useState<DailyEntry | null>(null)

  useEffect(() => {
    let cancelled = false
    const previousDate = format(subDays(parseISO(date), 1), DATE_FORMAT)
    dailyEntryRepository
      .getByDate(previousDate)
      .then((result) => {
        if (!cancelled) setEntry(result ?? null)
      })
      .catch(() => {
        // No prior-day entry is a minor cosmetic loss (the delta stat just
        // doesn't show), not worth surfacing as an error state.
      })
    return () => {
      cancelled = true
    }
  }, [date])

  return entry
}
