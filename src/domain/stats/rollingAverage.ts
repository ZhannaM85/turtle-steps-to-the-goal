import { differenceInCalendarDays, parseISO } from 'date-fns'
import type { DailyEntry } from '@/domain/dailyEntry'

export type NumericEntryField = 'weightKg' | 'caloriesConsumed'

export interface RollingAveragePoint {
  date: string
  average: number | null
}

/**
 * For each distinct date present in `entries`, averages `field` over the
 * trailing `windowDays` days (inclusive of that date), skipping entries
 * that don't have `field` set. A day with no qualifying values in its
 * window gets `average: null` rather than being dropped.
 */
export function rollingAverage(
  entries: DailyEntry[],
  field: NumericEntryField,
  windowDays: number,
): RollingAveragePoint[] {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))
  const dates = [...new Set(sorted.map((e) => e.date))]

  return dates.map((date) => {
    const windowStart = parseISO(date)
    const valuesInWindow = sorted
      .filter((e) => {
        const value = e[field]
        if (value === undefined) return false
        const daysBefore = differenceInCalendarDays(
          windowStart,
          parseISO(e.date),
        )
        return daysBefore >= 0 && daysBefore < windowDays
      })
      .map((e) => e[field] as number)

    const average =
      valuesInWindow.length === 0
        ? null
        : valuesInWindow.reduce((sum, v) => sum + v, 0) / valuesInWindow.length

    return { date, average }
  })
}
