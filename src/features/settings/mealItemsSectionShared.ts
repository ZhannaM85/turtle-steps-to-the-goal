import type { MealItem } from '@/domain/mealItem'
import { useTranslation } from '@/i18n'
import { IndexedDbMealItemRepository } from '@/infrastructure/persistence/indexeddb'

// #289 — read-only, one-shot lookup outside the store, same module-scope
// pattern MealList.tsx already uses for its own barcode-scan entry point.
export const mealItemRepositoryForBarcodeLookup =
  new IndexedDbMealItemRepository()

/** #583 — protein/fat/carbs labels mirror kcal's /100g cue when that mode
 * is on; portion mode keeps the plain names. */
export function macroFieldLabel(
  macro: 'protein' | 'fat' | 'carbs',
  macroMode: 'per100g' | 'perPortion',
  t: ReturnType<typeof useTranslation>,
): string {
  if (macroMode === 'per100g') {
    switch (macro) {
      case 'protein':
        return t.dailyEntry.proteinPer100gLabel
      case 'fat':
        return t.dailyEntry.fatPer100gLabel
      case 'carbs':
        return t.dailyEntry.carbsPer100gLabel
    }
  }
  switch (macro) {
    case 'protein':
      return t.dailyEntry.proteinLabel
    case 'fat':
      return t.dailyEntry.fatLabel
    case 'carbs':
      return t.dailyEntry.carbsLabel
  }
}

/** #583 — stronger field framing on the dense Settings Dishes nutrition
 * inputs (muted panel + default transparent input made borders easy to miss). */
export const nutritionFieldClassName = 'border-border bg-background'

/** #789 — Settings list search matches name or barcode (spaces ignored). */
export function mealItemMatchesSearch(item: MealItem, rawQuery: string): boolean {
  const query = rawQuery.trim().toLowerCase()
  if (!query) return true
  if (item.name.toLowerCase().includes(query)) return true
  if (!item.barcode) return false
  const queryDigits = query.replace(/\s+/g, '')
  return item.barcode.replace(/\s+/g, '').includes(queryDigits)
}
