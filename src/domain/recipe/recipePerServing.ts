import type { Recipe } from './Recipe'

// Required-but-possibly-undefined keys (not optional properties) so this
// can be passed straight into shared/lib/macroScaling.ts's
// formatComputedTotal, which expects the same shape.
export interface RecipeServingTotals {
  amountKcal: number
  proteinG: number | undefined
  fatG: number | undefined
  carbsG: number | undefined
}

/** Only `ingredients`/`servings` are ever read here — lets a caller building
 * a live preview from in-progress form state (no id/timestamps yet) pass a
 * bare `{ ingredients, servings }` instead of a full `Recipe`. */
type RecipeForServingMath = Pick<Recipe, 'ingredients' | 'servings'>

type MacroField = 'proteinG' | 'fatG' | 'carbsG'

function ingredientsMacroTotal(
  recipe: RecipeForServingMath,
  field: MacroField,
): number | undefined {
  const values = recipe.ingredients
    .map((ingredient) => ingredient[field])
    .filter((value): value is number => value !== undefined)
  if (values.length === 0) return undefined
  return values.reduce((sum, value) => sum + value, 0)
}

/**
 * The combined ingredient totals divided by the recipe's own yield
 * (#251) — e.g. a 2000kcal pot of chili that makes 4 servings is 500kcal
 * per serving. Undefined (not 0) for a macro none of the ingredients
 * logged, same "nothing recorded" convention `calorieEntryTotals.ts`
 * already uses for a CalorieEntry's own items.
 */
export function recipePerServing(
  recipe: RecipeForServingMath,
): RecipeServingTotals {
  const totalKcal = recipe.ingredients.reduce(
    (sum, ingredient) => sum + ingredient.amountKcal,
    0,
  )
  const totalProtein = ingredientsMacroTotal(recipe, 'proteinG')
  const totalFat = ingredientsMacroTotal(recipe, 'fatG')
  const totalCarbs = ingredientsMacroTotal(recipe, 'carbsG')

  return {
    amountKcal: totalKcal / recipe.servings,
    proteinG: totalProtein === undefined ? undefined : totalProtein / recipe.servings,
    fatG: totalFat === undefined ? undefined : totalFat / recipe.servings,
    carbsG: totalCarbs === undefined ? undefined : totalCarbs / recipe.servings,
  }
}

/**
 * Scales a recipe's per-serving totals by however many servings were
 * actually eaten (#251) — the result of "logging" a recipe: one
 * `CalorieItem`-shaped payload for the combined dish, not one item per
 * original ingredient (the whole point is collapsing the recipe into a
 * single loggable dish, same as picking a food from `FoodPickerDialog`
 * scales its per-100g rate by a quantity).
 */
export function recipeServingsTotal(
  recipe: RecipeForServingMath,
  servingsEaten: number,
): RecipeServingTotals {
  const perServing = recipePerServing(recipe)
  return {
    amountKcal: perServing.amountKcal * servingsEaten,
    proteinG:
      perServing.proteinG === undefined
        ? undefined
        : perServing.proteinG * servingsEaten,
    fatG:
      perServing.fatG === undefined ? undefined : perServing.fatG * servingsEaten,
    carbsG:
      perServing.carbsG === undefined
        ? undefined
        : perServing.carbsG * servingsEaten,
  }
}
