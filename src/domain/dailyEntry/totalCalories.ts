import { calorieEntryKcal } from './calorieEntryTotals'
import type { CalorieEntry, DayTotals } from './DailyEntry'

/** Sums a day's logged calorie entries (each summed over its own items,
 * #81) plus optional day-level totals (#549). Undefined (not 0) when
 * neither meals nor dayTotals contribute. */
export function totalCalories(
  entries: CalorieEntry[] | undefined,
  dayTotals?: DayTotals,
): number | undefined {
  const hasMeals = entries !== undefined && entries.length > 0
  const mealSum = hasMeals
    ? entries.reduce((sum, entry) => sum + calorieEntryKcal(entry), 0)
    : undefined
  const dayKcal = dayTotals?.amountKcal

  if (mealSum === undefined && dayKcal === undefined) return undefined
  return (mealSum ?? 0) + (dayKcal ?? 0)
}
