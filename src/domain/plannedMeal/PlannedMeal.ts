/**
 * A lightweight "planned for a future day" meal (#614) — deliberately much
 * smaller than a real `CalorieEntry`: just a name and an optional rough
 * calorie estimate, no items/macros/brand/emotion. Lives in its own store
 * entirely separate from `DailyEntry.calorieEntries`, so it can never be
 * summed into any day's totals or analytics until explicitly promoted
 * (`PlannedMealsSection.tsx` copies it into a real `CalorieEntry` and
 * deletes the draft) — the design fork the issue called out (drafts store
 * vs. `DailyEntry` rows flagged `isPlanned`) was resolved in favor of this
 * separate store specifically so a draft can never distort a day's
 * numbers by accident.
 */
export interface PlannedMeal {
  id: string
  /** The date this meal is planned *for* — not when it was staged. */
  date: string
  name: string
  amountKcal?: number
  createdAt: string
}
