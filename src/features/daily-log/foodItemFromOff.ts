import type { FoodItem } from '@/data/foods'
import type { OffNutritionPer100g } from './openFoodFactsParse'

/** Map an Open Food Facts hit (#256/#531) into a synthetic curated-shaped
 * `FoodItem` so existing confirm/quantity UI can reuse it unchanged. */
export function foodItemFromOff(hit: {
  name: string
  code?: string
} & OffNutritionPer100g): FoodItem {
  return {
    id: hit.code ? `off-${hit.code}` : `off-${hit.name}`,
    en: hit.name,
    ru: hit.name,
    kcal100: hit.kcal100,
    protein100: hit.protein100 ?? 0,
    fat100: hit.fat100 ?? 0,
    carbs100: hit.carbs100 ?? 0,
    fiber100: hit.fiber100,
    sodium100Mg: hit.sodium100Mg,
    potassium100Mg: hit.potassium100Mg,
    magnesium100Mg: hit.magnesium100Mg,
  }
}

/** Scale per-100g mg micros to a portion. */
export function scaleOffMicros(
  food: Pick<
    FoodItem,
    'sodium100Mg' | 'potassium100Mg' | 'magnesium100Mg'
  >,
  grams: number,
): {
  sodiumMg?: number
  potassiumMg?: number
  magnesiumMg?: number
} {
  const scale = grams / 100
  const scaleMg = (per100: number | undefined) =>
    per100 === undefined ? undefined : Math.round(per100 * scale)
  return {
    sodiumMg: scaleMg(food.sodium100Mg),
    potassiumMg: scaleMg(food.potassium100Mg),
    magnesiumMg: scaleMg(food.magnesium100Mg),
  }
}
