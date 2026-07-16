import {
  differenceInCalendarWeeks,
  endOfWeek,
  format,
  parseISO,
  startOfWeek,
  type Day,
} from 'date-fns'

export interface CurrentWeekInfo {
  weekNumber: number
  weekStart: string
  weekEnd: string
}

const DATE_FORMAT = 'yyyy-MM-dd'

/**
 * Which week "today" falls in, numbered from the week containing the
 * earliest logged entry (Week 1) — deliberately not anchored to the
 * goal's creation date, since goals have no start date (#14) and can be
 * renewed freely without resetting the count. If nothing has been logged
 * yet, today's week counts as Week 1 (it becomes the historical week 1
 * as soon as something is logged).
 *
 * `weekStartsOn` (#85) defaults to Monday (`1`, the original ISO-week
 * behavior) — callers resolve the user's week-start preference via
 * `resolveWeekStartsOn` and pass the result in, this function itself has
 * no knowledge of that preference.
 */
export function currentWeekInfo(
  today: Date,
  earliestEntryDate: string | undefined,
  weekStartsOn: Day = 1,
): CurrentWeekInfo {
  const todayWeekStart = startOfWeek(today, { weekStartsOn })
  const anchorWeekStart = earliestEntryDate
    ? startOfWeek(parseISO(earliestEntryDate), { weekStartsOn })
    : todayWeekStart

  const weekNumber =
    differenceInCalendarWeeks(todayWeekStart, anchorWeekStart, {
      weekStartsOn,
    }) + 1

  return {
    weekNumber,
    weekStart: format(todayWeekStart, DATE_FORMAT),
    weekEnd: format(endOfWeek(today, { weekStartsOn }), DATE_FORMAT),
  }
}
