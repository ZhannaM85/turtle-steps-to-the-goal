import {
  totalCalories,
  totalCarbs,
  totalFat,
  totalProtein,
  type DailyEntry,
} from '@/domain/dailyEntry'

export interface DateRangeSummary {
  averageWeightKg: number | null
  averageCalories: number | null
  /** Averaged only over days that logged that particular macro (#53
   * reasoning) — same convention as weeklySummaries/monthlySummaries. */
  averageProteinG: number | null
  averageFatG: number | null
  averageCarbsG: number | null
  /** How many distinct dates within [startDate, endDate] have an entry at
   * all (regardless of what fields it logged) — lets a caller show "3 of 7
   * days logged" rather than silently averaging over a sparse range. */
  loggedDayCount: number
}

function average(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

/**
 * Same per-field averaging as weeklySummaries.ts/monthlySummaries.ts, but
 * for an arbitrary user-picked [startDate, endDate] range instead of a
 * calendar week/month (#222) — powers CompareRangesView's side-by-side
 * comparison of two ranges rather than a chronological list of periods.
 * Inclusive of both endpoints, ISO date string comparison (safe since
 * DailyEntry.date is always 'yyyy-MM-dd').
 */
export function dateRangeSummary(
  entries: DailyEntry[],
  startDate: string,
  endDate: string,
): DateRangeSummary {
  const inRange = entries.filter(
    (entry) => entry.date >= startDate && entry.date <= endDate,
  )

  const weights = inRange
    .map((e) => e.weightKg)
    .filter((v): v is number => v !== undefined)
  const calories = inRange
    .map((e) => totalCalories(e.calorieEntries))
    .filter((v): v is number => v !== undefined)
  const protein = inRange
    .map((e) => totalProtein(e.calorieEntries))
    .filter((v): v is number => v !== undefined)
  const fat = inRange
    .map((e) => totalFat(e.calorieEntries))
    .filter((v): v is number => v !== undefined)
  const carbs = inRange
    .map((e) => totalCarbs(e.calorieEntries))
    .filter((v): v is number => v !== undefined)

  return {
    averageWeightKg: average(weights),
    averageCalories: average(calories),
    averageProteinG: average(protein),
    averageFatG: average(fat),
    averageCarbsG: average(carbs),
    loggedDayCount: inRange.length,
  }
}
