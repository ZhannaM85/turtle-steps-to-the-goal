import type { DailyEntry } from './DailyEntry'

/**
 * #767 — meals store a custom eating-reason as the label string. Renaming
 * that label in Settings rewrites matching meals so the Day card / export
 * stay in sync with the list.
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
    if (!meals?.some((meal) => meal.eatingReason === from)) continue
    changed.push({
      ...entry,
      calorieEntries: meals.map((meal) =>
        meal.eatingReason === from ? { ...meal, eatingReason: to } : meal,
      ),
      updatedAt: now,
    })
  }
  return changed
}
