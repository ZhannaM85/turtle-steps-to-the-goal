import type { DailyEntry } from '@/domain/dailyEntry'
import {
  mealSlotKeyForLabel,
  type MealSlotDefaultTimes,
} from '@/shared/lib/mealLabel'

export interface StampSlotDefaultsResult {
  entries: DailyEntry[]
  mealCount: number
}

/**
 * #595 — stamp `timeEaten` onto meals that have a known Breakfast/Lunch/
 * Dinner/Snack label but no recorded clock, using the remembered slot
 * defaults. Leaves timed meals and unknown labels untouched. Returns only
 * entries that actually changed (for callers to upsert) plus how many
 * meals were stamped.
 */
export function stampSlotDefaultsOnUntimedMeals(
  entries: readonly DailyEntry[],
  slotTimes: MealSlotDefaultTimes,
): StampSlotDefaultsResult {
  const changed: DailyEntry[] = []
  let mealCount = 0

  for (const entry of entries) {
    const meals = entry.calorieEntries
    if (!meals?.length) continue

    let entryChanged = false
    const nextMeals = meals.map((meal) => {
      if (meal.timeEaten) return meal
      const slot = mealSlotKeyForLabel(meal.label)
      if (!slot) return meal
      entryChanged = true
      mealCount += 1
      return { ...meal, timeEaten: slotTimes[slot] }
    })

    if (entryChanged) {
      changed.push({
        ...entry,
        calorieEntries: nextMeals,
        updatedAt: new Date().toISOString(),
      })
    }
  }

  return { entries: changed, mealCount }
}

/** How many untimed slot-labeled meals would receive a stamp (#595). */
export function countUntimedSlotMeals(
  entries: readonly DailyEntry[],
): number {
  let count = 0
  for (const entry of entries) {
    for (const meal of entry.calorieEntries ?? []) {
      if (meal.timeEaten) continue
      if (mealSlotKeyForLabel(meal.label)) count += 1
    }
  }
  return count
}
