import type { DailyEntry } from '@/domain/dailyEntry'
import type { Dictionary } from '@/i18n'
import { effectiveMealLabel } from '@/shared/lib/mealLabel'

export interface MealNameTally {
  name: string
  count: number
}

/**
 * How often each displayed meal name appeared (#816) — custom
 * CalorieEntry.label when set, else the positional default
 * (Breakfast/Lunch/Dinner/Snack / Meal N).
 */
export function mealNameTallies(
  entries: DailyEntry[],
  t: Dictionary,
): MealNameTally[] {
  const byName = new Map<string, number>()

  for (const entry of entries) {
    const meals = entry.calorieEntries ?? []
    meals.forEach((meal, index) => {
      const name = effectiveMealLabel(t, index + 1, meal.label)
      byName.set(name, (byName.get(name) ?? 0) + 1)
    })
  }

  return [...byName.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => {
      const scoreDiff = b.count - a.count
      return scoreDiff !== 0 ? scoreDiff : a.name.localeCompare(b.name)
    })
}
