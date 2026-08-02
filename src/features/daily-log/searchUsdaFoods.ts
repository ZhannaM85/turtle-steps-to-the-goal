import type { OnlineFoodHit } from './onlineFoodSearchTypes'

export const USDA_SEARCH_PAGE_SIZE = 12
export const USDA_FETCH_TIMEOUT_MS = 8000

/** Prefer datasets that report nutrients per 100g (#535). */
const USDA_DATA_TYPES = ['Foundation', 'SR Legacy', 'Survey (FNDDS)'] as const

const NUTRIENT = {
  kcal: 1008,
  protein: 1003,
  fat: 1004,
  carbs: 1005,
  fiber: 1079,
  sodium: 1093,
  potassium: 1092,
  magnesium: 1090,
} as const

function fdcApiKey(): string {
  const fromEnv = import.meta.env.VITE_FDC_API_KEY
  return typeof fromEnv === 'string' && fromEnv.trim()
    ? fromEnv.trim()
    : 'DEMO_KEY'
}

function nutrientValue(
  nutrients: unknown,
  nutrientId: number,
): number | undefined {
  if (!Array.isArray(nutrients)) return undefined
  for (const row of nutrients) {
    if (typeof row !== 'object' || row === null) continue
    const record = row as { nutrientId?: unknown; value?: unknown }
    if (record.nutrientId !== nutrientId) continue
    if (typeof record.value === 'number' && Number.isFinite(record.value)) {
      return record.value
    }
  }
  return undefined
}

function parseUsdaFood(food: unknown): OnlineFoodHit | null {
  if (typeof food !== 'object' || food === null) return null
  const record = food as {
    description?: unknown
    brandOwner?: unknown
    brandName?: unknown
    gtinUpc?: unknown
    foodNutrients?: unknown
  }
  const description =
    typeof record.description === 'string' ? record.description.trim() : ''
  if (!description) return null

  const nutrients = record.foodNutrients
  const kcal100 = nutrientValue(nutrients, NUTRIENT.kcal)
  if (kcal100 === undefined) return null

  const brandOwner =
    typeof record.brandOwner === 'string' ? record.brandOwner.trim() : ''
  const brandName =
    typeof record.brandName === 'string' ? record.brandName.trim() : ''
  const brand = brandName || brandOwner || undefined

  const code =
    typeof record.gtinUpc === 'string' && record.gtinUpc.trim()
      ? record.gtinUpc.trim()
      : undefined

  return {
    name: description,
    brand,
    code,
    kcal100,
    protein100: nutrientValue(nutrients, NUTRIENT.protein),
    fat100: nutrientValue(nutrients, NUTRIENT.fat),
    carbs100: nutrientValue(nutrients, NUTRIENT.carbs),
    fiber100: nutrientValue(nutrients, NUTRIENT.fiber),
    sodium100Mg: nutrientValue(nutrients, NUTRIENT.sodium),
    potassium100Mg: nutrientValue(nutrients, NUTRIENT.potassium),
    magnesium100Mg: nutrientValue(nutrients, NUTRIENT.magnesium),
  }
}

export type UsdaSearchOutcome =
  | { status: 'ok'; hits: OnlineFoodHit[] }
  | { status: 'empty'; hits: [] }
  | { status: 'unavailable'; hits: [] }
  | { status: 'aborted'; hits: [] }

/**
 * USDA FoodData Central search (#535) — Foundation / SR Legacy / FNDDS only
 * so nutrient values are per 100g. Uses `VITE_FDC_API_KEY` when set, else
 * USDA’s public `DEMO_KEY` (strict rate limits).
 */
export async function searchUsdaFoods(
  query: string,
  options: { signal?: AbortSignal; pageSize?: number } = {},
): Promise<UsdaSearchOutcome> {
  const trimmed = query.trim()
  if (trimmed.length < 2) return { status: 'empty', hits: [] }

  const pageSize = options.pageSize ?? USDA_SEARCH_PAGE_SIZE
  const controller = new AbortController()
  const timeoutId = setTimeout(
    () => controller.abort(),
    USDA_FETCH_TIMEOUT_MS,
  )
  const onOuterAbort = () => controller.abort()
  options.signal?.addEventListener('abort', onOuterAbort)

  try {
    const params = new URLSearchParams({
      api_key: fdcApiKey(),
      query: trimmed,
      pageSize: String(pageSize),
      pageNumber: '1',
    })
    for (const dataType of USDA_DATA_TYPES) {
      params.append('dataType', dataType)
    }

    const response = await fetch(
      `https://api.nal.usda.gov/fdc/v1/foods/search?${params}`,
      { signal: controller.signal },
    )
    if (!response.ok) return { status: 'unavailable', hits: [] }

    const data: unknown = await response.json()
    if (typeof data !== 'object' || data === null) {
      return { status: 'unavailable', hits: [] }
    }
    const foods = (data as { foods?: unknown }).foods
    if (!Array.isArray(foods)) return { status: 'unavailable', hits: [] }

    const hits: OnlineFoodHit[] = []
    for (const food of foods) {
      if (hits.length >= pageSize) break
      const parsed = parseUsdaFood(food)
      if (parsed) hits.push(parsed)
    }
    return hits.length > 0
      ? { status: 'ok', hits }
      : { status: 'empty', hits: [] }
  } catch (error) {
    if (options.signal?.aborted || controller.signal.aborted) {
      return { status: 'aborted', hits: [] }
    }
    void error
    return { status: 'unavailable', hits: [] }
  } finally {
    clearTimeout(timeoutId)
    options.signal?.removeEventListener('abort', onOuterAbort)
  }
}
