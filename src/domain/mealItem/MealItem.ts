/**
 * A reusable meal name (#50) — e.g. "Pizza" — independent of any single
 * logged CalorieEntry.note. No foreign key from CalorieEntry back to this:
 * renaming or deleting a MealItem never touches already-logged meals, it
 * only changes what's offered as a future autocomplete suggestion and what
 * appears in the Settings library.
 *
 * `lastAmountKcal`/`lastProteinG`/`lastFatG`/`lastCarbsG` (#86) — the most
 * recently logged values for a meal saved under this name, kept in sync by
 * `touch()`. Purely additive/optional, no IndexedDB version bump. Lets the
 * food picker (`FoodPickerDialog`) offer this item as something reusable —
 * "add it again with the same numbers" — not just a bare name. Items
 * touched before this existed simply have these fields undefined until
 * next saved with a note, and are excluded from the food-picker's search
 * until then (nothing to reuse yet).
 */
export interface MealItem {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  lastAmountKcal?: number
  lastProteinG?: number
  lastFatG?: number
  lastCarbsG?: number
  /** Portion weight in grams for the last time this name was manually
   * logged (#93) — same purely-additive/optional pattern as the fields
   * above, kept in sync by `touch()`. */
  lastAmountG?: number
  /** Marked as a "go-to" food (#276), independent of how recently it was
   * logged — `touch()`'s existing-item spread preserves this untouched on
   * every re-save, so logging the item again doesn't clear it. */
  favorite?: boolean
  /** Scanned product barcode (#256) — set the first time this item is
   * created via a barcode scan (local match or an Open Food Facts
   * fallback), so every later scan of the same barcode is an instant,
   * fully offline local match. Purely additive/optional; most items have
   * no barcode at all. */
  barcode?: string
}
