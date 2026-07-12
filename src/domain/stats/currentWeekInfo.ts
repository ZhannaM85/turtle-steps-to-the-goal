import {
  differenceInCalendarWeeks,
  endOfISOWeek,
  format,
  parseISO,
  startOfISOWeek,
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
 */
export function currentWeekInfo(
  today: Date,
  earliestEntryDate: string | undefined,
): CurrentWeekInfo {
  const todayWeekStart = startOfISOWeek(today)
  const anchorWeekStart = earliestEntryDate
    ? startOfISOWeek(parseISO(earliestEntryDate))
    : todayWeekStart

  const weekNumber =
    differenceInCalendarWeeks(todayWeekStart, anchorWeekStart, {
      weekStartsOn: 1,
    }) + 1

  return {
    weekNumber,
    weekStart: format(todayWeekStart, DATE_FORMAT),
    weekEnd: format(endOfISOWeek(today), DATE_FORMAT),
  }
}
