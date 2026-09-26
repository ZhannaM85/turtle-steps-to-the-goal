import type { Recipe } from '@/domain/recipe'
import { recipePerServing } from '@/domain/recipe'
import { normalizeMealLibraryName } from '@/domain/mealItem'
import { ratesFromAbsolute } from '@/shared/lib/macroScaling'
import { itemKey, type PickableItem } from './addMealDialogHelpers'

/** #995 — one search row per display name and per-100 g nutrition. */
export interface DedupedMealSearchHit {
  item: PickableItem
  /** Same food, kept out of the list. */
  hidden: PickableItem[]
}

/**
 * Round the way the search subtitle does (`formatNumber` with 0 fraction
 * digits) so two rows that look the same collapse even when the raw
 * values differ past the decimal the user never sees.
 */
export function displayedMacroKey(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return ''
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    useGrouping: false,
  }).format(value)
}

/**
 * #1006 — slack so rounding does not split the same dish. One unit covers
 * a displayed gram (7 vs 6.5 per 100 g). Five percent covers kcal that
 * land a few units apart after two portion sizes are scaled (129 vs 133
 * per 100 g). A wider gap stays a different density (266 vs 300 per 100 g).
 */
const PER_100G_ABS_TOLERANCE = 1
const PER_100G_RATIO_TOLERANCE = 0.05

interface Per100gMacros {
  kcal: number
  protein: number | undefined
  fat: number | undefined
  carbs: number | undefined
}

function closeEnough(
  left: number | undefined,
  right: number | undefined,
): boolean {
  if (left === undefined && right === undefined) return true
  if (left === undefined || right === undefined) return false
  if (!Number.isFinite(left) || !Number.isFinite(right)) return false
  const diff = Math.abs(left - right)
  const scale = Math.max(Math.abs(left), Math.abs(right))
  return diff <= Math.max(PER_100G_ABS_TOLERANCE, scale * PER_100G_RATIO_TOLERANCE)
}

function samePer100g(left: Per100gMacros, right: Per100gMacros): boolean {
  return (
    closeEnough(left.kcal, right.kcal) &&
    closeEnough(left.protein, right.protein) &&
    closeEnough(left.fat, right.fat) &&
    closeEnough(left.carbs, right.carbs)
  )
}

/** Grams in one serving, only when every ingredient recorded a weight. */
function recipeGramsPerServing(recipe: Recipe): number | undefined {
  const { ingredients, servings } = recipe
  if (!Number.isFinite(servings) || servings <= 0 || ingredients.length === 0) {
    return undefined
  }
  if (
    !ingredients.every(
      (ingredient) => ingredient.amountG !== undefined && ingredient.amountG > 0,
    )
  ) {
    return undefined
  }
  const total = ingredients.reduce(
    (sum, ingredient) => sum + (ingredient.amountG ?? 0),
    0,
  )
  const perServing = total / servings
  return perServing > 0 ? perServing : undefined
}

/**
 * #1006 — kcal and Б/Ж/У per 100 g. A dish uses `lastAmountG`; a recipe
 * uses ingredient grams divided by servings. Missing weight is treated as
 * 100 g (`ratesFromAbsolute`), so two rows that only know absolute totals
 * still match the way #995 did.
 */
function per100gMacros(item: PickableItem): Per100gMacros {
  if (item.source === 'food') {
    return {
      kcal: item.food.kcal100,
      protein: item.food.protein100,
      fat: item.food.fat100,
      carbs: item.food.carbs100,
    }
  }
  if (item.source === 'recipe') {
    const perServing = recipePerServing(item.recipe)
    const rates = ratesFromAbsolute(
      perServing.amountKcal,
      perServing.proteinG,
      perServing.fatG,
      perServing.carbsG,
      recipeGramsPerServing(item.recipe),
    )
    return {
      kcal: rates.kcal100,
      protein: rates.protein100,
      fat: rates.fat100,
      carbs: rates.carbs100,
    }
  }
  const rates = ratesFromAbsolute(
    item.mealItem.lastAmountKcal,
    item.mealItem.lastProteinG,
    item.mealItem.lastFatG,
    item.mealItem.lastCarbsG,
    item.mealItem.lastAmountG,
  )
  return {
    kcal: rates.kcal100,
    protein: rates.protein100,
    fat: rates.fat100,
    carbs: rates.carbs100,
  }
}

/** Recipe outranks a saved dish, which outranks a built-in food. */
function sourceRank(item: PickableItem): number {
  if (item.source === 'recipe') return 2
  if (item.source === 'mealItem') return 1
  return 0
}

interface SearchGroup {
  name: string
  macros: Per100gMacros
  items: PickableItem[]
}

/**
 * #995 / #1006 — collapse hits that share a display name and the same
 * per-100 g kcal / protein / fat / carbs. The group's place in the list
 * stays where the first hit was (already search-ranked). A recipe
 * replaces a dish or built-in food in that slot; otherwise the earlier
 * hit stays.
 */
export function dedupeMealSearchMatches(
  items: readonly PickableItem[],
  textFor: (item: PickableItem) => string,
): DedupedMealSearchHit[] {
  const groups: SearchGroup[] = []
  for (const item of items) {
    const name = normalizeMealLibraryName(textFor(item))
    const macros = per100gMacros(item)
    const group = groups.find(
      (existing) => existing.name === name && samePer100g(existing.macros, macros),
    )
    if (!group) {
      groups.push({ name, macros, items: [item] })
      continue
    }
    if (!group.items.some((existing) => itemKey(existing) === itemKey(item))) {
      group.items.push(item)
    }
  }

  return groups.map((group) => {
    const item = group.items.reduce((best, candidate) =>
      sourceRank(candidate) > sourceRank(best) ? candidate : best,
    )
    return {
      item,
      hidden: group.items.filter((other) => itemKey(other) !== itemKey(item)),
    }
  })
}
