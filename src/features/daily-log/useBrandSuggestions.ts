import { useEffect, useMemo, useState } from 'react'
import type { MealItem } from '@/domain/mealItem'
import { IndexedDbDailyEntryRepository } from '@/infrastructure/persistence/indexeddb'
import {
  brandOccurrencesFromDailyEntries,
  brandOccurrencesFromMealItems,
  uniqueBrandsRanked,
  type BrandOccurrence,
} from './brandSuggestions'

const dailyEntryRepository = new IndexedDbDailyEntryRepository()

/**
 * Brands already stored on library foods and in meal history (#969) —
 * not a global food database. History is scanned when the add-meal brand
 * field is shown; the in-memory library list is always available.
 */
export function useBrandSuggestions(
  mealItems: readonly MealItem[],
  enabled: boolean,
): string[] {
  const [historyOccurrences, setHistoryOccurrences] = useState<
    BrandOccurrence[]
  >([])

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    dailyEntryRepository
      .getAll()
      .then((entries) => {
        if (!cancelled) {
          setHistoryOccurrences(brandOccurrencesFromDailyEntries(entries))
        }
      })
      .catch(() => {
        // Library brands still work if history cannot be read.
      })
    return () => {
      cancelled = true
    }
  }, [enabled])

  return useMemo(
    () =>
      uniqueBrandsRanked([
        ...brandOccurrencesFromMealItems(mealItems),
        ...historyOccurrences,
      ]),
    [mealItems, historyOccurrences],
  )
}
