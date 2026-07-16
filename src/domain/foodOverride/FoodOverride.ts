/**
 * A per-device customization of one curated `foods.ts` entry (#90) — hide
 * it from the picker entirely, and/or correct its per-100g numbers. Keyed
 * by the food's stable `id` (from `data/foods.ts`), not a separate uuid,
 * since there's exactly one override per food at most. Local-only, like
 * `mealItems` — not included in export/import backups.
 */
export interface FoodOverride {
  foodId: string
  hidden?: boolean
  kcal100?: number
  protein100?: number
  fat100?: number
  carbs100?: number
  updatedAt: string
}
