import { differenceInCalendarDays, format, parseISO, subDays } from 'date-fns'
import { totalCalories, totalProtein, type DailyEntry } from '@/domain/dailyEntry'

export interface RecentAverages {
  averageCalories: number | null
  averageProteinG: number | null
}

export interface RecentAverageWindowRange {
  /** Inclusive start (`yyyy-MM-dd`) — `today - (windowDays - 1)`. */
  startDate: string
  /** Inclusive end (`yyyy-MM-dd`) — calendar day of `today`. */
  endDate: string
}

function average(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

/**
 * Calendar bounds for the same trailing window `recentAverages` uses
 * (`today` inclusive, counting back `windowDays` days). Empty days are
 * still part of this range even when they don't enter the average
 * denominator — the UI shows which days *could* have fed the stat.
 */
export function recentAverageWindowRange(
  windowDays: number,
  today: Date = new Date(),
): RecentAverageWindowRange {
  const endDate = format(today, 'yyyy-MM-dd')
  const startDate = format(subDays(today, windowDays - 1), 'yyyy-MM-dd')
  return { startDate, endDate }
}

/**
 * Averages calories/protein over the trailing `windowDays` days counting
 * back from `today` (inclusive) — anchored to the real current date, not
 * the most recent logged entry, so a gap in logging shrinks the sample
 * rather than silently shifting the window to stale data. Days with no
 * calorie entries at all are skipped rather than counted as 0.
 */
export function recentAverages(
  entries: DailyEntry[],
  windowDays: number,
  today: Date = new Date(),
): RecentAverages {
  const inWindow = entries.filter((entry) => {
    const daysBefore = differenceInCalendarDays(today, parseISO(entry.date))
    return daysBefore >= 0 && daysBefore < windowDays
  })

  const calories = inWindow
    .map((entry) => totalCalories(entry.calorieEntries))
    .filter((value): value is number => value !== undefined)
  const protein = inWindow
    .map((entry) => totalProtein(entry.calorieEntries))
    .filter((value): value is number => value !== undefined)

  return {
    averageCalories: average(calories),
    averageProteinG: average(protein),
  }
}
