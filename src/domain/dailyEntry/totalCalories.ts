import type { CalorieEntry } from './DailyEntry'

/** Sums a day's logged calorie entries. Undefined (not 0) when none exist. */
export function totalCalories(
  entries: CalorieEntry[] | undefined,
): number | undefined {
  if (!entries || entries.length === 0) return undefined
  return entries.reduce((sum, entry) => sum + entry.amountKcal, 0)
}
