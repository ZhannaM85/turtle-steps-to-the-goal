import { isCholesterolImpact, type CholesterolImpact } from '@/domain/cholesterol'
import {
  collapseCatalogName,
  type CatalogFoodDraft,
} from './CatalogFoodImport'

export type CatalogFoodPasteError = 'invalid-json' | 'wrong-basis' | 'empty'

export type CatalogFoodPasteFailureReason =
  | 'missing-name'
  | 'missing-macros'
  | 'not-food'
  | 'wrong-basis'

export interface CatalogFoodPasteFailure {
  label: string
  reason: CatalogFoodPasteFailureReason
}

export type CatalogFoodPasteResult =
  | { ok: false; error: CatalogFoodPasteError }
  | {
      ok: true
      foods: CatalogFoodDraft[]
      failures: CatalogFoodPasteFailure[]
    }

function readString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const next = collapseCatalogName(value)
  return next || undefined
}

function readMacro(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return value
  }
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim().replace(',', '.')
  if (!trimmed) return undefined
  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed) || parsed < 0) return undefined
  return parsed
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

/** Missing basis means per 100 g. Anything else is refused. */
function isPer100gBasis(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return true
  if (typeof value !== 'string') return false
  const basis = collapseCatalogName(value).toLowerCase()
  return basis === 'per 100 g' || basis === 'per 100g'
}

function readImpact(value: unknown): CholesterolImpact {
  if (typeof value === 'string' && isCholesterolImpact(value)) return value
  return 'unknown'
}

function readName(record: Record<string, unknown>): string | undefined {
  return (
    readString(record.nameRu) ?? readString(record.ru) ?? readString(record.name)
  )
}

function readMacros(record: Record<string, unknown>):
  | Pick<CatalogFoodDraft, 'kcal100' | 'protein100' | 'fat100' | 'carbs100'>
  | undefined {
  const kcal100 = readMacro(
    record.caloriesPer100g ?? record.kcalPer100g ?? record.kcal100,
  )
  const protein100 = readMacro(record.proteinPer100g ?? record.protein100)
  const fat100 = readMacro(record.fatPer100g ?? record.fat100)
  const carbs100 = readMacro(record.carbsPer100g ?? record.carbs100)
  if (
    kcal100 === undefined ||
    protein100 === undefined ||
    fat100 === undefined ||
    carbs100 === undefined
  ) {
    return undefined
  }
  return { kcal100, protein100, fat100, carbs100 }
}

function parseOne(
  value: unknown,
  index: number,
): { food: CatalogFoodDraft } | { failure: CatalogFoodPasteFailure } {
  const fallback = `Item ${index + 1}`
  if (!isRecord(value)) return { failure: { label: fallback, reason: 'not-food' } }
  const nameRu = readName(value)
  if (!isPer100gBasis(value.nutritionBasis)) {
    return { failure: { label: nameRu ?? fallback, reason: 'wrong-basis' } }
  }
  if (!nameRu) return { failure: { label: fallback, reason: 'missing-name' } }
  const macros = readMacros(value)
  if (!macros) return { failure: { label: nameRu, reason: 'missing-macros' } }
  const food: CatalogFoodDraft = {
    nameRu,
    ...macros,
    cholesterolImpact: readImpact(value.cholesterolImpact),
  }
  const nameEn = readString(value.nameEn) ?? readString(value.en)
  const cholesterolReason =
    readString(value.cholesterolReasonRu) ?? readString(value.cholesterolReason)
  const cholesterolReasonEn = readString(value.cholesterolReasonEn)
  if (nameEn) food.nameEn = nameEn
  if (cholesterolReason) food.cholesterolReason = cholesterolReason
  if (cholesterolReasonEn) food.cholesterolReasonEn = cholesterolReasonEn
  return { food }
}

function foodList(parsed: unknown):
  | { error: CatalogFoodPasteError }
  | { list: unknown[] } {
  if (Array.isArray(parsed)) {
    return parsed.length === 0 ? { error: 'empty' } : { list: parsed }
  }
  if (!isRecord(parsed)) return { error: 'invalid-json' }
  if (Array.isArray(parsed.foods)) {
    if (!isPer100gBasis(parsed.nutritionBasis)) return { error: 'wrong-basis' }
    return parsed.foods.length === 0 ? { error: 'empty' } : { list: parsed.foods }
  }
  return { list: [parsed] }
}

/**
 * #1015 — paste only. One food object, a top-level array, or
 * `{ foods, nutritionBasis? }`. Later copies of the same Russian name
 * replace earlier ones in this paste.
 */
export function parseCatalogFoodPaste(text: string): CatalogFoodPasteResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, error: 'invalid-json' }
  }
  const extracted = foodList(parsed)
  if ('error' in extracted) return { ok: false, error: extracted.error }

  const foods: CatalogFoodDraft[] = []
  const failures: CatalogFoodPasteFailure[] = []
  const indexByName = new Map<string, number>()
  extracted.list.forEach((item, index) => {
    const result = parseOne(item, index)
    if ('failure' in result) {
      failures.push(result.failure)
      return
    }
    const previous = indexByName.get(result.food.nameRu)
    if (previous === undefined) {
      indexByName.set(result.food.nameRu, foods.length)
      foods.push(result.food)
      return
    }
    foods[previous] = result.food
  })
  return { ok: true, foods, failures }
}
