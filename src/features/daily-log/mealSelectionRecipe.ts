import type { CalorieItem } from '@/domain/dailyEntry'
import { normalizeMealLibraryName } from '@/domain/mealItem'
import type { Recipe, RecipeIngredient } from '@/domain/recipe'
import { ratesFromAbsolute } from '@/shared/lib/macroScaling'

export interface MealSelectionTotals {
  amountKcal: number
  proteinG: number | undefined
  fatG: number | undefined
  carbsG: number | undefined
  /** Set only when every selected dish has a positive weight. */
  amountG: number | undefined
  per100g: {
    kcal100: number
    protein100: number | undefined
    fat100: number | undefined
    carbs100: number | undefined
  } | null
}

function definedSum(values: readonly (number | undefined)[]): number | undefined {
  const present = values.filter(
    (value): value is number => value !== undefined && Number.isFinite(value),
  )
  if (present.length === 0) return undefined
  return present.reduce((sum, value) => sum + value, 0)
}

/** Sum a meal selection. Per 100 g is the totals scaled by total grams. */
export function mealSelectionTotals(
  items: readonly Pick<
    CalorieItem,
    'amountKcal' | 'proteinG' | 'fatG' | 'carbsG' | 'amountG'
  >[],
): MealSelectionTotals {
  const amountKcal = items.reduce((sum, item) => sum + item.amountKcal, 0)
  const proteinG = definedSum(items.map((item) => item.proteinG))
  const fatG = definedSum(items.map((item) => item.fatG))
  const carbsG = definedSum(items.map((item) => item.carbsG))
  const allWeighed =
    items.length > 0 &&
    items.every((item) => item.amountG !== undefined && item.amountG > 0)
  const amountG = allWeighed
    ? items.reduce((sum, item) => sum + (item.amountG ?? 0), 0)
    : undefined
  const per100g =
    amountG !== undefined && amountG > 0
      ? ratesFromAbsolute(amountKcal, proteinG, fatG, carbsG, amountG)
      : null
  return {
    amountKcal,
    proteinG,
    fatG,
    carbsG,
    amountG,
    per100g: per100g
      ? {
          kcal100: per100g.kcal100,
          protein100: per100g.protein100,
          fat100: per100g.fat100,
          carbs100: per100g.carbs100,
        }
      : null,
  }
}

/**
 * #983 — one recipe, one serving, ingredients = the selected dishes.
 * Logging that serving later is the combined dish; per 100 g stays
 * derivable from the summed weight.
 */
export function recipeFromMealSelection(
  name: string,
  items: readonly CalorieItem[],
  now = new Date().toISOString(),
): Recipe | null {
  const trimmed = name.trim()
  const ingredients: RecipeIngredient[] = []
  for (const item of items) {
    const ingredientName = item.name?.trim()
    if (!ingredientName) continue
    ingredients.push({
      id: crypto.randomUUID(),
      name: ingredientName,
      brand: item.brand,
      amountKcal: item.amountKcal,
      proteinG: item.proteinG,
      fatG: item.fatG,
      carbsG: item.carbsG,
      amountG: item.amountG,
    })
  }
  if (!trimmed || ingredients.length === 0) return null
  return {
    id: crypto.randomUUID(),
    name: trimmed,
    ingredients,
    servings: 1,
    createdAt: now,
    updatedAt: now,
  }
}

/** A saved recipe the create-recipe sheet can compare against (#986, #988). */
export type SavedRecipeLookup = Pick<Recipe, 'id' | 'name'> & {
  ingredients?: readonly Pick<RecipeIngredient, 'name'>[]
}

/** A selected dish whose name is already a saved recipe (#986). */
export interface ExistingRecipeInSelection {
  /** Trimmed name of the selected dish, as shown in the meal. */
  ingredientName: string
  /** Stored recipe title to put in «Название рецепта». */
  recipeName: string
  recipeId: string
}

/** A saved recipe named in a create-recipe warning (#988). */
export interface SavedRecipeMatch {
  recipeName: string
  recipeId: string
}

interface StoredRecipeName {
  id: string
  name: string
}

function recipesByNormalizedName(
  recipes: readonly Pick<Recipe, 'id' | 'name'>[],
): Map<string, StoredRecipeName[]> {
  const byKey = new Map<string, StoredRecipeName[]>()
  for (const recipe of recipes) {
    const recipeName = recipe.name.trim()
    const key = normalizeMealLibraryName(recipeName)
    if (!key) continue
    const list = byKey.get(key)
    if (list) list.push({ id: recipe.id, name: recipeName })
    else byKey.set(key, [{ id: recipe.id, name: recipeName }])
  }
  return byKey
}

/**
 * #986 — recipes are keyed by id (names are not unique). A selected dish
 * matches one when its name matches a saved recipe the same way food-library
 * names match: trim, collapse spaces, case-insensitive. An exact display
 * match wins; otherwise the first stored recipe with that name.
 */
export function existingRecipesInMealSelection(
  items: readonly Pick<CalorieItem, 'name'>[],
  recipes: readonly Pick<Recipe, 'id' | 'name'>[],
): ExistingRecipeInSelection[] {
  const byKey = recipesByNormalizedName(recipes)
  const seen = new Set<string>()
  const matches: ExistingRecipeInSelection[] = []
  for (const item of items) {
    const ingredientName = item.name?.trim()
    if (!ingredientName) continue
    const key = normalizeMealLibraryName(ingredientName)
    if (!key || seen.has(key)) continue
    const hits = byKey.get(key)
    if (!hits || hits.length === 0) continue
    seen.add(key)
    const chosen = hits.find((hit) => hit.name === ingredientName) ?? hits[0]
    if (!chosen) continue
    matches.push({
      ingredientName,
      recipeName: chosen.name,
      recipeId: chosen.id,
    })
  }
  return matches
}

/**
 * #988 — identity of the foods, not the portion.
 * A logged dish and a recipe ingredient do not share an id (both are new
 * UUIDs per row), and grams are how much was used. Equality is the set of
 * normalized food names: trim, collapse spaces, case-insensitive, order
 * does not matter, repeated names count once.
 */
function ingredientNameSetKey(
  names: readonly (string | undefined)[],
): string | null {
  const keys = new Set<string>()
  for (const name of names) {
    const trimmed = name?.trim()
    if (!trimmed) continue
    const key = normalizeMealLibraryName(trimmed)
    if (key) keys.add(key)
  }
  if (keys.size === 0) return null
  return [...keys].sort().join('\u0000')
}

/** Saved recipes whose foods are the same set as the selection (#988). */
export function recipesWithSameIngredients(
  items: readonly Pick<CalorieItem, 'name'>[],
  recipes: readonly SavedRecipeLookup[],
): SavedRecipeMatch[] {
  const wanted = ingredientNameSetKey(items.map((item) => item.name))
  if (!wanted) return []
  const matches: SavedRecipeMatch[] = []
  const seen = new Set<string>()
  for (const recipe of recipes) {
    if (!recipe.ingredients || seen.has(recipe.id)) continue
    const key = ingredientNameSetKey(
      recipe.ingredients.map((ingredient) => ingredient.name),
    )
    if (key !== wanted) continue
    const recipeName = recipe.name.trim()
    if (!recipeName) continue
    seen.add(recipe.id)
    matches.push({ recipeName, recipeId: recipe.id })
  }
  return matches
}

/**
 * #988 — the typed «Название рецепта» matches a saved recipe the same way
 * #986 matches a selected dish: trim, collapse spaces, case-insensitive.
 * Exact display matches come first; other stored spellings follow.
 */
export function recipesMatchingTypedTitle(
  typedName: string,
  recipes: readonly Pick<Recipe, 'id' | 'name'>[],
): SavedRecipeMatch[] {
  const display = typedName.trim()
  const key = normalizeMealLibraryName(display)
  if (!key) return []
  const hits = recipesByNormalizedName(recipes).get(key)
  if (!hits || hits.length === 0) return []
  const exact = hits.filter((hit) => hit.name === display)
  const rest = hits.filter((hit) => hit.name !== display)
  return [...exact, ...rest].map((hit) => ({
    recipeName: hit.name,
    recipeId: hit.id,
  }))
}
