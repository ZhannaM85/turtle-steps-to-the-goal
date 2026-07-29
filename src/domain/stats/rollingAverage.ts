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
 *
 * #175 — this used to re-`.filter()` (and re-`parseISO()`) every entry for
 * every distinct date, an O(n²) pass that profiled as the dominant cost
 * (150+ seconds of the ~170s Dashboard load reported after a multi-year
 * Apple Health/Zepp Life import, ~9.6M `parseISO`/`differenceInCalendarDays`
 * calls total across this function's two call sites at ~2,190 entries).
 * Rewritten as a single O(n) sliding window over `sorted` (already
 * date-sorted) — each entry enters and leaves the running sum/count exactly
 * once, and each date's `parseISO` runs once, not once per other entry.
 * `DailyEntry.date` is a unique index (`Dexie`'s `&date`), so there's never
 * more than one entry per date to worry about.
 */
export function rollingAverage(
  entries: DailyEntry[],
  field: NumericEntryField | ValueExtractor,
  windowDays: number,
): RollingAveragePoint[] {
  const getValue: ValueExtractor =
    typeof field === 'function' ? field : (entry) => entry[field]
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))
  const parsedDates = sorted.map((e) => parseISO(e.date))

  let sum = 0
  let count = 0
  let windowStart = 0
  let nextToInclude = 0

  return sorted.map((currentEntry, i) => {
    const windowEnd = parsedDates[i]

    // Include every entry up to and including this date that hasn't
    // already entered the running sum.
    while (nextToInclude <= i) {
      const value = getValue(sorted[nextToInclude])
      if (value !== undefined) {
        sum += value
        count++
      }
      nextToInclude++
    }

    // Drop entries that fell out of the trailing window.
    while (
      windowStart < nextToInclude &&
      differenceInCalendarDays(windowEnd, parsedDates[windowStart]) >=
        windowDays
    ) {
      const value = getValue(sorted[windowStart])
      if (value !== undefined) {
        sum -= value
        count--
      }
      windowStart++
    }

    return {
      date: currentEntry.date,
      average: count === 0 ? null : sum / count,
    }
  })
}
