import type { DailyEntry } from './DailyEntry'
import { applyEatingReasons, mealEatingReasons } from './mealEatingReasons'

/**
 * #767 — meals store a custom eating-reason as the label string. Renaming
 * that label in Settings rewrites matching meals so the Day card / export
 * stay in sync with the list. **#774**: rewrites the id wherever it sits
 * in a multi-select list, not only the legacy single field.
 */
export function rewriteMealEatingReason(
  entries: DailyEntry[],
  from: string,
  to: string,
): DailyEntry[] {
  if (!from || from === to) return []
  const now = new Date().toISOString()
  const changed: DailyEntry[] = []
  for (const entry of entries) {
    const meals = entry.calorieEntries
    if (!meals?.some((meal) => mealEatingReasons(meal).includes(from))) {
      continue
    }
    changed.push({
      ...entry,
      calorieEntries: meals.map((meal) => {
        const reasons = mealEatingReasons(meal)
        if (!reasons.includes(from)) return meal
        return applyEatingReasons(
          meal,
          reasons.map((reason) => (reason === from ? to : reason)),
        )
      }),
      updatedAt: now,
    })
  }
  return changed
}
