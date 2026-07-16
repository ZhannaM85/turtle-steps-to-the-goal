import type { FoodItem } from '@/data/foods'
import type { FoodOverride } from '@/domain/foodOverride'

/**
 * Merges one food's shipped numbers with its override, if any — the
 * per-item half of `applyFoodOverrides` below, exposed separately for
 * `FoodListSettingsScreen.tsx`, which needs each row's *effective* values
 * without the hidden-item filtering (a hidden food still needs to render
 * there, just with a "Hidden" badge and a Show button).
 */
export function effectiveFoodItem(
  food: FoodItem,
  override: FoodOverride | undefined,
): FoodItem {
  if (!override) return food
  return {
    ...food,
    kcal100: override.kcal100 ?? food.kcal100,
    protein100: override.protein100 ?? food.protein100,
    fat100: override.fat100 ?? food.fat100,
    carbs100: override.carbs100 ?? food.carbs100,
  }
}

/**
 * Applies per-device food-list customizations (#90) to the curated
 * `foods.ts` list: drops hidden items, and swaps in corrected per-100g
 * numbers where overridden. Pure — the shipped `foods.ts` data itself is
 * never mutated, only the list handed to search/display.
 */
export function applyFoodOverrides(
  foods: FoodItem[],
  overrides: FoodOverride[],
): FoodItem[] {
  const byId = new Map(overrides.map((override) => [override.foodId, override]))
  return foods
    .filter((food) => !byId.get(food.id)?.hidden)
    .map((food) => effectiveFoodItem(food, byId.get(food.id)))
}
