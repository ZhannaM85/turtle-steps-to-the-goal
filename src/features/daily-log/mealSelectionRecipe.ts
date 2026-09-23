import type { CalorieItem } from '@/domain/dailyEntry'
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
