import { differenceInCalendarDays, parseISO } from 'date-fns'
import type { DailyEntry } from '@/domain/dailyEntry'

export type NumericEntryField = 'weightKg'
type ValueExtractor = (entry: DailyEntry) => number | undefined

export interface RollingAveragePoint {
  date: string
  average: number | null
}

/**
 * For each distinct date present in `entries`, averages a value over the
 * trailing `windowDays` days (inclusive of that date), skipping entries
 * where the value is undefined. A day with no qualifying values in its
 * window gets `average: null` rather than being dropped. `field` can be a
 * plain `DailyEntry` key, or an extractor function for values that aren't a
 * plain field (e.g. a computed calorie total from `calorieEntries`).
 */
export function rollingAverage(
  entries: DailyEntry[],
  field: NumericEntryField | ValueExtractor,
  windowDays: number,
): RollingAveragePoint[] {
  const getValue: ValueExtractor =
    typeof field === 'function' ? field : (entry) => entry[field]
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))
  const dates = [...new Set(sorted.map((e) => e.date))]

  return dates.map((date) => {
    const windowStart = parseISO(date)
    const valuesInWindow = sorted
      .filter((e) => {
        const value = getValue(e)
        if (value === undefined) return false
        const daysBefore = differenceInCalendarDays(
          windowStart,
          parseISO(e.date),
        )
        return daysBefore >= 0 && daysBefore < windowDays
      })
      .map((e) => getValue(e) as number)

    const average =
      valuesInWindow.length === 0
        ? null
        : valuesInWindow.reduce((sum, v) => sum + v, 0) / valuesInWindow.length

    return { date, average }
  })
}
