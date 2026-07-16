import { getDay, parseISO, type Day } from 'date-fns'
import type { WeekStart } from '@/stores'

/**
 * Turns the week-start preference (#85) into a concrete date-fns
 * `weekStartsOn` day number. `'firstEntryWeekday'` anchors to whatever
 * weekday the earliest logged entry falls on; falls back to Monday (`1`,
 * the original behavior) both for `'monday'` and when there's no entry yet
 * to anchor to.
 */
export function resolveWeekStartsOn(
  weekStart: WeekStart,
  earliestEntryDate: string | undefined,
): Day {
  if (weekStart === 'firstEntryWeekday' && earliestEntryDate) {
    // getDay() returns a plain number; its range (0-6) is always a valid
    // Day, TypeScript just can't narrow that from the return type.
    return getDay(parseISO(earliestEntryDate)) as Day
  }
  return 1
}
