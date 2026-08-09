/**
 * #661 — compact shareable food payload (OS share sheet / QR / deep link).
 * No backend: the entire food is encoded in the URL query param.
 *
 * Design (confirmed with user):
 * - Payload = name + optional brand/barcode/serving + absolute macros +
 *   per-100g rates when available + named servings.
 * - Receive = always review/edit before adding.
 * - Dedupe = barcode if present, else normalized name (MealItem has no
 *   brand field; brand rides in the payload for review display only).
 */
import { z } from 'zod'
import type { MealItem, MealItemServing } from '@/domain/mealItem'
import { normalizeMealLibraryName } from '@/domain/mealItem'
import { ratesFromAbsolute, scaleFromPer100g } from '@/shared/lib/macroScaling'

export const SHARE_FOOD_QUERY_PARAM = 'shareFood'

const sharedFoodServingSchema = z.object({
  en: z.string().min(1),
  ru: z.string().min(1),
  grams: z.number().positive(),
})

export const sharedFoodPayloadSchema = z.object({
  v: z.literal(1),
  name: z.string().min(1),
  brand: z.string().min(1).optional(),
  barcode: z.string().min(1).optional(),
  amountG: z.number().positive().optional(),
  amountKcal: z.number().nonnegative().optional(),
  proteinG: z.number().nonnegative().optional(),
  fatG: z.number().nonnegative().optional(),
  carbsG: z.number().nonnegative().optional(),
  kcal100: z.number().nonnegative().optional(),
  protein100: z.number().nonnegative().optional(),
  fat100: z.number().nonnegative().optional(),
  carbs100: z.number().nonnegative().optional(),
  servings: z.array(sharedFoodServingSchema).optional(),
})

export type SharedFoodPayload = z.infer<typeof sharedFoodPayloadSchema>

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlToBytes(encoded: string): Uint8Array {
  const padded = encoded.replace(/-/g, '+').replace(/_/g, '/')
  const padLength = (4 - (padded.length % 4)) % 4
  const withPad = padded + '='.repeat(padLength)
  const binary = atob(withPad)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/** Compact JSON → base64url (no padding), safe for query strings / QR. */
export function encodeSharedFoodPayload(payload: SharedFoodPayload): string {
  const json = JSON.stringify(sharedFoodPayloadSchema.parse(payload))
  return bytesToBase64Url(new TextEncoder().encode(json))
}

export function decodeSharedFoodPayload(
  encoded: string,
): SharedFoodPayload | null {
  try {
    const json = new TextDecoder().decode(base64UrlToBytes(encoded.trim()))
    const parsed: unknown = JSON.parse(json)
    const result = sharedFoodPayloadSchema.safeParse(parsed)
    return result.success ? result.data : null
  } catch {
    return null
  }
}

/** Build share payload from a personal library item. */
export function mealItemToSharedFoodPayload(item: MealItem): SharedFoodPayload {
  const payload: SharedFoodPayload = {
    v: 1,
    name: item.name,
  }
  if (item.barcode) payload.barcode = item.barcode
  if (item.lastAmountG !== undefined && item.lastAmountG > 0) {
    payload.amountG = item.lastAmountG
  }
  if (item.lastAmountKcal !== undefined) {
    payload.amountKcal = item.lastAmountKcal
    if (item.lastProteinG !== undefined) payload.proteinG = item.lastProteinG
    if (item.lastFatG !== undefined) payload.fatG = item.lastFatG
    if (item.lastCarbsG !== undefined) payload.carbsG = item.lastCarbsG
    const rates = ratesFromAbsolute(
      item.lastAmountKcal,
      item.lastProteinG,
      item.lastFatG,
      item.lastCarbsG,
      item.lastAmountG,
    )
    payload.kcal100 = rates.kcal100
    if (rates.protein100 !== undefined) payload.protein100 = rates.protein100
    if (rates.fat100 !== undefined) payload.fat100 = rates.fat100
    if (rates.carbs100 !== undefined) payload.carbs100 = rates.carbs100
  }
  if (item.servings && item.servings.length > 0) {
    payload.servings = item.servings.map((s) => ({
      en: s.en,
      ru: s.ru,
      grams: s.grams,
    }))
  }
  return payload
}

/**
 * Resolve absolute nutrition to write into MealItem.last* fields.
 * Prefers absolute values from the payload; otherwise scales from per-100g
 * using amountG (default 100g).
 */
export function sharedFoodAbsoluteNutrition(payload: SharedFoodPayload): {
  amountKcal: number | undefined
  proteinG: number | undefined
  fatG: number | undefined
  carbsG: number | undefined
  amountG: number | undefined
} {
  if (payload.amountKcal !== undefined) {
    return {
      amountKcal: payload.amountKcal,
      proteinG: payload.proteinG,
      fatG: payload.fatG,
      carbsG: payload.carbsG,
      amountG: payload.amountG,
    }
  }
  if (payload.kcal100 !== undefined) {
    // scaleFromPer100g takes a count of 100g portions, not raw grams.
    const grams = payload.amountG && payload.amountG > 0 ? payload.amountG : 100
    const scaled = scaleFromPer100g(
      payload.kcal100,
      payload.protein100,
      payload.fat100,
      payload.carbs100,
      String(grams / 100),
    )
    return {
      amountKcal: scaled.amountKcal,
      proteinG: scaled.proteinG,
      fatG: scaled.fatG,
      carbsG: scaled.carbsG,
      amountG: scaled.amountG,
    }
  }
  return {
    amountKcal: undefined,
    proteinG: undefined,
    fatG: undefined,
    carbsG: undefined,
    amountG: payload.amountG,
  }
}

export function findMatchingMealItem(
  payload: SharedFoodPayload,
  items: readonly MealItem[],
): MealItem | undefined {
  if (payload.barcode) {
    const byBarcode = items.find((item) => item.barcode === payload.barcode)
    if (byBarcode) return byBarcode
  }
  const needle = normalizeMealLibraryName(payload.name)
  return items.find((item) => normalizeMealLibraryName(item.name) === needle)
}

export function sharedFoodServings(
  payload: SharedFoodPayload,
): MealItemServing[] | undefined {
  if (!payload.servings || payload.servings.length === 0) return undefined
  return payload.servings.map((s) => ({
    en: s.en,
    ru: s.ru,
    grams: s.grams,
  }))
}

/** Parse a shared-food deep link or raw QR text into a payload. */
export function parseSharedFoodFromText(
  text: string,
): SharedFoodPayload | null {
  const trimmed = text.trim()
  if (!trimmed) return null

  // Full URL with ?shareFood=…
  try {
    const url = new URL(trimmed)
    const param = url.searchParams.get(SHARE_FOOD_QUERY_PARAM)
    if (param) return decodeSharedFoodPayload(param)
  } catch {
    // Not a URL — fall through.
  }

  // Bare query fragment or path-local "?shareFood=…"
  const queryMatch = /(?:^|[?&])shareFood=([^&#]+)/.exec(trimmed)
  if (queryMatch?.[1]) {
    try {
      return decodeSharedFoodPayload(decodeURIComponent(queryMatch[1]))
    } catch {
      return decodeSharedFoodPayload(queryMatch[1])
    }
  }

  // Raw base64url payload (paste without URL wrapper).
  return decodeSharedFoodPayload(trimmed)
}
