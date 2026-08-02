import type { MealItem, MealItemRepository } from '@/domain/mealItem'
import { parseOffProduct } from './openFoodFactsParse'
import type { OffNutritionPer100g } from './openFoodFactsParse'

export type BarcodeLookupResult =
  | { source: 'local'; item: MealItem }
  | ({
      source: 'openFoodFacts'
      name: string
      brand?: string
    } & OffNutritionPer100g)
  | { source: 'none' }

const OFF_FETCH_TIMEOUT_MS = 5000

const OFF_USER_AGENT =
  'TurtleStepsToTheGoal/1.0 (https://github.com/ZhannaM85/turtle-steps-to-the-goal)'

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
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=product_name,brands,nutriments,code`,
      {
        signal: AbortSignal.timeout(OFF_FETCH_TIMEOUT_MS),
        headers: { 'User-Agent': OFF_USER_AGENT },
      },
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
    const parsed = parseOffProduct((data as { product?: unknown }).product)
    if (!parsed) return { source: 'none' }

    return {
      source: 'openFoodFacts',
      name: parsed.name,
      brand: parsed.brand,
      kcal100: parsed.kcal100,
      protein100: parsed.protein100,
      fat100: parsed.fat100,
      carbs100: parsed.carbs100,
      fiber100: parsed.fiber100,
      sodium100Mg: parsed.sodium100Mg,
      potassium100Mg: parsed.potassium100Mg,
      magnesium100Mg: parsed.magnesium100Mg,
    }
  } catch {
    // Network failure, timeout, or malformed JSON — same as a genuine
    // no-match; the caller falls back to a blank manual-entry form.
    return { source: 'none' }
  }
}
