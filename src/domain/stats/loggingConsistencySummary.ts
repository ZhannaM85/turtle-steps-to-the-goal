import { differenceInCalendarDays, parseISO } from 'date-fns'
import { totalCalories, type DailyEntry } from '@/domain/dailyEntry'
import type { LoggingConsistencyWeek } from './loggingConsistency'

export interface LoggingConsistencySummary {
  /** Count of days with intensity > 0 (at least one core signal logged),
   * over the exact window of weeks the heatmap renders — not a separate
   * time range from what's on screen. */
  daysLoggedCount: number
  /** Sum of calories across days in that same window that have a calorie
   * entry — `null` when none of those days logged calories. */
  totalCaloriesOverLoggedDays: number | null
  /** Sum of calories over a fixed trailing 7 days (independent of however
   * many weeks the heatmap happens to render) — `null` when none of the
   * last 7 days logged calories. */
  totalCaloriesLast7Days: number | null
}

function sum(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((total, value) => total + value, 0)
}

/**
 * #268 — plain totals shown next to `LoggingConsistencyHeatmap` so "how
 * many days did I actually log" doesn't require counting colored boxes by
 * eye. Deliberately totals, not averages (distinct from `recentAverages`)
 * — a curiosity stat, not a guilt/streak metric.
 */
export function loggingConsistencySummary(
  entries: DailyEntry[],
  weeks: LoggingConsistencyWeek[],
  today: Date = new Date(),
): LoggingConsistencySummary {
  const days = weeks.flatMap((week) => week.days)
  const daysLoggedCount = days.filter((day) => day.intensity > 0).length

  const entriesByDate = new Map(entries.map((entry) => [entry.date, entry]))
  const loggedDayCalories = days
    .map((day) => totalCalories(entriesByDate.get(day.date)?.calorieEntries))
    .filter((value): value is number => value !== undefined)

  const last7DayCalories = entries
    .filter((entry) => {
      const daysBefore = differenceInCalendarDays(today, parseISO(entry.date))
      return daysBefore >= 0 && daysBefore < 7
    })
    .map((entry) => totalCalories(entry.calorieEntries))
    .filter((value): value is number => value !== undefined)

  return {
    daysLoggedCount,
    totalCaloriesOverLoggedDays: sum(loggedDayCalories),
    totalCaloriesLast7Days: sum(last7DayCalories),
  }
}
