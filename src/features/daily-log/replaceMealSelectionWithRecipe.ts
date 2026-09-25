import type { CalorieEntry, CalorieItem } from '@/domain/dailyEntry'
import type { Recipe } from '@/domain/recipe'
import { recipeServingsTotal } from '@/domain/recipe'

function sumDefined(
  values: readonly (number | undefined)[],
): number | undefined {
  const present = values.filter(
    (value): value is number => value !== undefined && Number.isFinite(value),
  )
  if (present.length === 0) return undefined
  return present.reduce((sum, value) => sum + value, 0)
}

/**
 * #987 — one serving of the recipe just saved from this meal.
 * kcal and macros come from the recipe (one serving). Fiber and
 * electrolytes stay on the meal line because a recipe does not store
 * them; otherwise replacing the foods would drop those totals.
 */
export function calorieItemForRecipeServing(
  recipe: Recipe,
  sourceItems: readonly Pick<
    CalorieItem,
    'fiberG' | 'sodiumMg' | 'potassiumMg' | 'magnesiumMg'
  >[] = [],
): CalorieItem {
  const totals = recipeServingsTotal(recipe, 1)
  const allWeighed =
    recipe.ingredients.length > 0 &&
    recipe.ingredients.every(
      (item) => item.amountG !== undefined && item.amountG > 0,
    )
  const amountG =
    allWeighed && recipe.servings > 0
      ? recipe.ingredients.reduce((sum, item) => sum + (item.amountG ?? 0), 0) /
        recipe.servings
      : undefined
  const item: CalorieItem = {
    id: crypto.randomUUID(),
    name: recipe.name,
    amountKcal: totals.amountKcal,
    proteinG: totals.proteinG,
    fatG: totals.fatG,
    carbsG: totals.carbsG,
  }
  const fiberG = sumDefined(sourceItems.map((source) => source.fiberG))
  const sodiumMg = sumDefined(sourceItems.map((source) => source.sodiumMg))
  const potassiumMg = sumDefined(sourceItems.map((source) => source.potassiumMg))
  const magnesiumMg = sumDefined(sourceItems.map((source) => source.magnesiumMg))
  if (fiberG !== undefined) item.fiberG = fiberG
  if (sodiumMg !== undefined) item.sodiumMg = sodiumMg
  if (potassiumMg !== undefined) item.potassiumMg = potassiumMg
  if (magnesiumMg !== undefined) item.magnesiumMg = magnesiumMg
  if (amountG !== undefined) item.amountG = amountG
  return item
}

/**
 * Drop the foods that built the recipe and insert the recipe line where
 * the first of those foods was. Other dishes stay in order.
 */
export function replaceSelectedMealItems(
  items: readonly CalorieItem[],
  removeIds: readonly string[],
  added: CalorieItem,
): CalorieItem[] {
  const remove = new Set(removeIds)
  let inserted = false
  const next: CalorieItem[] = []
  for (const item of items) {
    if (!remove.has(item.id)) {
      next.push(item)
      continue
    }
    if (!inserted) {
      next.push(added)
      inserted = true
    }
  }
  if (!inserted) next.push(added)
  return next
}

export function replaceSelectedItemsInEntry(
  entry: CalorieEntry,
  removeIds: readonly string[],
  added: CalorieItem,
): CalorieEntry {
  return {
    ...entry,
    items: replaceSelectedMealItems(entry.items, removeIds, added),
  }
}

export function replaceSelectedItemsInEntries(
  entries: readonly CalorieEntry[],
  mealId: string,
  removeIds: readonly string[],
  added: CalorieItem,
): CalorieEntry[] {
  return entries.map((entry) =>
    entry.id === mealId
      ? replaceSelectedItemsInEntry(entry, removeIds, added)
      : entry,
  )
}
