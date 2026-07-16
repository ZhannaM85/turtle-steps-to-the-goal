import { calorieEntryKcal } from './calorieEntryTotals'
import type { CalorieEntry } from './DailyEntry'

/** Sums a day's logged calorie entries (each summed over its own items,
 * #81). Undefined (not 0) when none exist. */
export function totalCalories(
  entries: CalorieEntry[] | undefined,
): number | undefined {
  if (!entries || entries.length === 0) return undefined
  return entries.reduce((sum, entry) => sum + calorieEntryKcal(entry), 0)
}
