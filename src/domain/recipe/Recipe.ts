/**
 * One ingredient within a recipe (#251) — structurally the same shape as
 * `CalorieItem` (id/name/brand/amountKcal/macros/amountG), minus `emotion`
 * (a reaction belongs to a logged dish, not a raw ingredient in a
 * template). `amountKcal`/macros are the *absolute* totals for however
 * much of this ingredient the recipe actually uses (e.g. "2 cups of
 * cooked rice", not "rice, per 100g") — the same per-100g-rate +
 * quantity model every other manual-entry surface in this app already
 * uses (`scaleFromPer100g`) computes these before an ingredient is added,
 * exactly like a normal logged item.
 */
export interface RecipeIngredient {
  id: string
  name: string
  brand?: string
  amountKcal: number
  proteinG?: number
  fatG?: number
  carbsG?: number
  /** Portion weight in grams, if this ingredient was entered via a
   * per-100g rate + quantity rather than a raw total (#93's same
   * reasoning) — purely a memory aid, not used in any computation here. */
  amountG?: number
}

/**
 * A named list of ingredients plus a total yield (#251) — "this makes 6
 * servings of chili" — closing the gap `MealItem` (a single dish with
 * fixed per-100g macros) can't cover: a *combined* dish logged by the
 * serving, not by weight. Logging a recipe (`recipePerServing`, see
 * below) scales its combined ingredient totals by however many servings
 * were eaten, into one `CalorieItem`-shaped result — the same "one row
 * per dish" shape every other logged meal already uses, not one row per
 * original ingredient.
 *
 * Editing a recipe (renaming it, correcting an ingredient) only affects
 * *future* logging — same "renames never touch past entries" precedent
 * `MealItem.rename()` already established — since nothing here is a
 * foreign key from any already-logged `CalorieItem`.
 */
export interface Recipe {
  id: string
  name: string
  ingredients: RecipeIngredient[]
  /** Total yield this recipe makes, e.g. 6 — must be positive; the whole
   * point of a recipe is dividing its combined totals into servings. */
  servings: number
  createdAt: string
  updatedAt: string
}
