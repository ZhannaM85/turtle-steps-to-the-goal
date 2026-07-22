import type { MealItem, MealItemRepository } from '@/domain/mealItem'

export type BarcodeLookupResult =
  | { source: 'local'; item: MealItem }
  | {
      source: 'openFoodFacts'
      name: string
      brand?: string
      kcal100: number
      protein100?: number
      fat100?: number
      carbs100?: number
    }
  | { source: 'none' }

const OFF_FETCH_TIMEOUT_MS = 5000

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

/**
 * Local-first barcode lookup with an Open Food Facts fallback (#256).
 * Every *repeat* scan of the same barcode is an instant, fully offline
 * local match (`findByBarcode`) — the network fetch only ever matters for
 * a barcode's *first* scan, and only while online at all (skipped
 * entirely rather than waiting out a doomed request, same reasoning
 * `useOnlineStatus()` already exists for elsewhere in this app). OFF is
 * user-submitted data of varying quality, so this only ever returns
 * something to *prefill* a form the user still reviews before saving —
 * never auto-saves. Parsed defensively: any missing/malformed field (most
 * of all no product name, or no kcal figure — the two things this app
 * can't do without) falls through to 'none', same as a genuine no-match.
 */
export async function lookupBarcode(
  barcode: string,
  mealItemRepository: MealItemRepository,
  isOnline: boolean,
): Promise<BarcodeLookupResult> {
  const localMatch = await mealItemRepository.findByBarcode(barcode)
  if (localMatch) return { source: 'local', item: localMatch }

  if (!isOnline) return { source: 'none' }

  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`,
      { signal: AbortSignal.timeout(OFF_FETCH_TIMEOUT_MS) },
    )
    if (!response.ok) return { source: 'none' }

    const data: unknown = await response.json()
    if (
      typeof data !== 'object' ||
      data === null ||
      (data as { status?: unknown }).status !== 1
    ) {
      return { source: 'none' }
    }
    const product = (data as { product?: unknown }).product
    if (typeof product !== 'object' || product === null) {
      return { source: 'none' }
    }

    const productName = (product as { product_name?: unknown }).product_name
    const name = typeof productName === 'string' ? productName.trim() : ''
    if (!name) return { source: 'none' }

    const nutriments = (product as { nutriments?: unknown }).nutriments
    const nutrimentValue = (key: string): number | undefined => {
      if (typeof nutriments !== 'object' || nutriments === null) return undefined
      const value = (nutriments as Record<string, unknown>)[key]
      return isFiniteNumber(value) ? value : undefined
    }

    const kcal100 = nutrimentValue('energy-kcal_100g')
    if (kcal100 === undefined) return { source: 'none' }

    const brandsField = (product as { brands?: unknown }).brands
    const brand =
      typeof brandsField === 'string' && brandsField.trim()
        ? brandsField.split(',')[0].trim()
        : undefined

    return {
      source: 'openFoodFacts',
      name,
      brand,
      kcal100,
      protein100: nutrimentValue('proteins_100g'),
      fat100: nutrimentValue('fat_100g'),
      carbs100: nutrimentValue('carbohydrates_100g'),
    }
  } catch {
    // Network failure, timeout, or malformed JSON — same as a genuine
    // no-match; the caller falls back to a blank manual-entry form.
    return { source: 'none' }
  }
}
