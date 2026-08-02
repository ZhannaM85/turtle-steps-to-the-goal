/**
 * Shared Open Food Facts nutriment parsing (#256 barcode, #531 name search).
 * OFF data quality varies — callers treat a missing kcal figure as unusable.
 */

export type OffNutritionPer100g = {
  kcal100: number
  protein100?: number
  fat100?: number
  carbs100?: number
  fiber100?: number
  /** Sodium per 100g in milligrams (converted from OFF's g when needed). */
  sodium100Mg?: number
  potassium100Mg?: number
  magnesium100Mg?: number
}

export type OffProductIdentity = {
  name: string
  brand?: string
  code?: string
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function nutrimentValue(
  nutriments: Record<string, unknown>,
  key: string,
): number | undefined {
  const value = nutriments[key]
  return isFiniteNumber(value) ? value : undefined
}

/**
 * Parses OFF `nutriments` into per-100g values this app understands.
 * Returns `null` when energy-kcal_100g is missing (can't log without kcal).
 */
export function parseOffNutriments(
  nutriments: unknown,
): OffNutritionPer100g | null {
  if (typeof nutriments !== 'object' || nutriments === null) return null
  const record = nutriments as Record<string, unknown>
  const kcal100 = nutrimentValue(record, 'energy-kcal_100g')
  if (kcal100 === undefined) return null

  // OFF stores sodium in grams; potassium/magnesium are usually mg.
  const sodiumG = nutrimentValue(record, 'sodium_100g')
  const potassium = nutrimentValue(record, 'potassium_100g')
  const magnesium = nutrimentValue(record, 'magnesium_100g')

  return {
    kcal100,
    protein100: nutrimentValue(record, 'proteins_100g'),
    fat100: nutrimentValue(record, 'fat_100g'),
    carbs100: nutrimentValue(record, 'carbohydrates_100g'),
    fiber100: nutrimentValue(record, 'fiber_100g'),
    sodium100Mg:
      sodiumG === undefined ? undefined : Math.round(sodiumG * 1000),
    potassium100Mg:
      potassium === undefined ? undefined : Math.round(potassium),
    magnesium100Mg:
      magnesium === undefined ? undefined : Math.round(magnesium),
  }
}

export function parseOffProductIdentity(
  product: unknown,
): OffProductIdentity | null {
  if (typeof product !== 'object' || product === null) return null
  const record = product as Record<string, unknown>
  const productName = record.product_name
  const name = typeof productName === 'string' ? productName.trim() : ''
  if (!name) return null

  const brandsField = record.brands
  const brand =
    typeof brandsField === 'string' && brandsField.trim()
      ? brandsField.split(',')[0].trim()
      : undefined

  const codeField = record.code
  const code =
    typeof codeField === 'string' && codeField.trim()
      ? codeField.trim()
      : typeof codeField === 'number'
        ? String(codeField)
        : undefined

  return { name, brand, code }
}

/** Build a complete parse result, or null if name/kcal are unusable. */
export function parseOffProduct(
  product: unknown,
): (OffProductIdentity & OffNutritionPer100g) | null {
  const identity = parseOffProductIdentity(product)
  if (!identity) return null
  if (typeof product !== 'object' || product === null) return null
  const nutrition = parseOffNutriments(
    (product as { nutriments?: unknown }).nutriments,
  )
  if (!nutrition) return null
  return { ...identity, ...nutrition }
}
