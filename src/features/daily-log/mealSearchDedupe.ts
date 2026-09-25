import { recipePerServing } from '@/domain/recipe'
import { normalizeMealLibraryName } from '@/domain/mealItem'
import { itemKey, type PickableItem } from './addMealDialogHelpers'

/** #995 — one search row per display name + the kcal/БЖУ the row shows. */
export interface DedupedMealSearchHit {
  item: PickableItem
  /** Same name and displayed macros, kept out of the list. */
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

function macroIdentity(item: PickableItem): string {
  if (item.source === 'recipe') {
    const perServing = recipePerServing(item.recipe)
    return [
      displayedMacroKey(perServing.amountKcal),
      displayedMacroKey(perServing.proteinG),
      displayedMacroKey(perServing.fatG),
      displayedMacroKey(perServing.carbsG),
    ].join('|')
  }
  if (item.source === 'mealItem') {
    return [
      displayedMacroKey(item.mealItem.lastAmountKcal),
      displayedMacroKey(item.mealItem.lastProteinG),
      displayedMacroKey(item.mealItem.lastFatG),
      displayedMacroKey(item.mealItem.lastCarbsG),
    ].join('|')
  }
  return [
    displayedMacroKey(item.food.kcal100),
    displayedMacroKey(item.food.protein100),
    displayedMacroKey(item.food.fat100),
    displayedMacroKey(item.food.carbs100),
  ].join('|')
}

function identityKey(item: PickableItem, textFor: (item: PickableItem) => string): string {
  return `${normalizeMealLibraryName(textFor(item))}\u0000${macroIdentity(item)}`
}

/** Recipe outranks a saved dish, which outranks a built-in food. */
function sourceRank(item: PickableItem): number {
  if (item.source === 'recipe') return 2
  if (item.source === 'mealItem') return 1
  return 0
}

/**
 * #995 — collapse hits that share a display name and the same rounded
 * kcal / protein / fat / carbs. The group's place in the list stays where
 * the first hit was (already search-ranked). A recipe replaces a dish or
 * built-in food in that slot; otherwise the earlier hit stays.
 */
export function dedupeMealSearchMatches(
  items: readonly PickableItem[],
  textFor: (item: PickableItem) => string,
): DedupedMealSearchHit[] {
  const order: string[] = []
  const groups = new Map<string, PickableItem[]>()
  for (const item of items) {
    const key = identityKey(item, textFor)
    const group = groups.get(key)
    if (!group) {
      groups.set(key, [item])
      order.push(key)
    } else if (!group.some((existing) => itemKey(existing) === itemKey(item))) {
      group.push(item)
    }
  }

  return order.map((key) => {
    const group = groups.get(key) ?? []
    const item = group.reduce((best, candidate) =>
      sourceRank(candidate) > sourceRank(best) ? candidate : best,
    )
    return {
      item,
      hidden: group.filter((other) => itemKey(other) !== itemKey(item)),
    }
  })
}
