/**
 * #982 — several foods in the same `?shareFood=` slot as a single food.
 * Envelope is `v: 2` with `items` of the existing `v: 1` records, so a
 * one-food link stays byte-compatible with older builds.
 */
import { z } from 'zod'
import type { CalorieItem } from '@/domain/dailyEntry'
import type { MealItem } from '@/domain/mealItem'
import {
  calorieItemToShareMealItem,
  decodeShareFoodJson,
  encodeShareFoodJson,
  extractEncodedShareFood,
  findMatchingMealItem,
  mealItemToSharedFoodPayload,
  sharedFoodPayloadSchema,
  type SharedFoodPayload,
} from './sharedFoodPayload'

export const sharedFoodBatchPayloadSchema = z.object({
  v: z.literal(2),
  items: z.array(sharedFoodPayloadSchema).min(2),
})

export type SharedFoodBatchPayload = z.infer<typeof sharedFoodBatchPayloadSchema>

export type DecodedShareFood =
  | { kind: 'one'; payload: SharedFoodPayload }
  | { kind: 'many'; items: SharedFoodPayload[] }

export function encodeSharedFoodBatchPayload(
  items: readonly SharedFoodPayload[],
): string {
  return encodeShareFoodJson(
    sharedFoodBatchPayloadSchema.parse({ v: 2, items }),
  )
}

/** `v: 1` stays one food; `v: 2` is the whole batch. Anything else is null. */
export function decodeSharedFoodLink(encoded: string): DecodedShareFood | null {
  const parsed = decodeShareFoodJson(encoded)
  if (parsed == null) return null
  const one = sharedFoodPayloadSchema.safeParse(parsed)
  if (one.success) return { kind: 'one', payload: one.data }
  const many = sharedFoodBatchPayloadSchema.safeParse(parsed)
  if (many.success) return { kind: 'many', items: many.data.items }
  return null
}

export function parseSharedFoodLinkFromText(
  text: string,
): DecodedShareFood | null {
  const encoded = extractEncodedShareFood(text)
  if (!encoded) return null
  return decodeSharedFoodLink(encoded)
}

/** Named dishes in meal order, library barcode/servings overlaid per row. */
export function calorieItemsToShareMealItems(
  items: readonly Pick<
    CalorieItem,
    'id' | 'name' | 'amountKcal' | 'proteinG' | 'fatG' | 'carbsG' | 'amountG'
  >[],
  library: readonly MealItem[],
): MealItem[] {
  const out: MealItem[] = []
  for (const item of items) {
    const name = item.name?.trim()
    if (!name) continue
    const match = findMatchingMealItem({ v: 1, name }, library)
    const next = calorieItemToShareMealItem(item, match)
    if (next) out.push(next)
  }
  return out
}

export function mealItemsToSharedFoodPayloads(
  items: readonly MealItem[],
): SharedFoodPayload[] {
  return items.map(mealItemToSharedFoodPayload)
}
