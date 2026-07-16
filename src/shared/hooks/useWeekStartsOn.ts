import type { Day } from 'date-fns'
import type { DailyEntry } from '@/domain/dailyEntry'
import { resolveWeekStartsOn } from '@/shared/lib/resolveWeekStartsOn'
import { useWeekStartStore } from '@/stores'

/**
 * Resolves the week-start preference (#85) against a set of entries already
 * in hand — for `weeklySummaries()` callers (Dashboard, History), which
 * already have `entries` as a prop rather than needing a separate
 * repository fetch the way `useCurrentWeekInfo` does.
 */
export function useWeekStartsOn(entries: DailyEntry[]): Day {
  const weekStart = useWeekStartStore((state) => state.weekStart)
  const earliestEntryDate = entries.reduce<string | undefined>(
    (min, entry) => (min === undefined || entry.date < min ? entry.date : min),
    undefined,
  )
  return resolveWeekStartsOn(weekStart, earliestEntryDate)
}
