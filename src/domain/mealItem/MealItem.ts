/**
 * A reusable meal name (#50) — e.g. "Pizza" — independent of any single
 * logged CalorieEntry.note. No foreign key from CalorieEntry back to this:
 * renaming or deleting a MealItem never touches already-logged meals, it
 * only changes what's offered as a future autocomplete suggestion and what
 * appears in the Settings library.
 */
export interface MealItem {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}
