import type { CalorieItem, DailyEntry } from '@/domain/dailyEntry'
import { normalizeMealLibraryName } from './mealLibraryBackfill'

/** Nutrition snapshot applied onto matching past `CalorieItem`s (#542). */
export interface MealLibraryPropagationNutrition {
  amountKcal: number
  proteinG?: number
  fatG?: number
  carbsG?: number
  fiberG?: number
  amountG?: number
  sodiumMg?: number
  potassiumMg?: number
  magnesiumMg?: number
}

export interface MealLibraryPropagationPatch {
  /** Match past lines by normalized `CalorieItem.name` (pre-rename name). */
  matchName: string
  /** When set, rewrite matching line names to this display string. */
  newName?: string
  /** When set, overwrite matching line macros with these absolutes. */
  nutrition?: MealLibraryPropagationNutrition
}

export interface MealLibraryPropagationResult {
  /** Entries that need upserting (unchanged days omitted). */
  entriesToUpsert: DailyEntry[]
  updatedItemCount: number
}

function itemMatchesName(item: CalorieItem, matchKey: string): boolean {
  const raw = item.name?.trim()
  if (!raw) return false
  return normalizeMealLibraryName(raw) === matchKey
}

/** Count past meal lines whose name matches (normalized). */
export function countMealLibraryNameMatches(
  entries: readonly DailyEntry[],
  matchName: string,
): number {
  const key = normalizeMealLibraryName(matchName)
  if (!key) return 0
  let count = 0
  for (const entry of entries) {
    for (const meal of entry.calorieEntries ?? []) {
      for (const item of meal.items ?? []) {
        if (itemMatchesName(item, key)) count += 1
      }
    }
  }
  return count
}

/**
 * #542 — rewrite matching past meal lines. Pure; caller upserts
 * `entriesToUpsert`. Does not touch the MealItem library itself.
 */
export function propagateMealLibraryEdit(
  entries: readonly DailyEntry[],
  patch: MealLibraryPropagationPatch,
): MealLibraryPropagationResult {
  const key = normalizeMealLibraryName(patch.matchName)
  if (!key || (!patch.newName?.trim() && !patch.nutrition)) {
    return { entriesToUpsert: [], updatedItemCount: 0 }
  }

  const newName = patch.newName?.trim()
  const nutrition = patch.nutrition
  const entriesToUpsert: DailyEntry[] = []
  let updatedItemCount = 0
  const now = new Date().toISOString()

  for (const entry of entries) {
    let entryChanged = false
    const calorieEntries = (entry.calorieEntries ?? []).map((meal) => {
      let mealChanged = false
      const items = (meal.items ?? []).map((item) => {
        if (!itemMatchesName(item, key)) return item
        updatedItemCount += 1
        mealChanged = true
        entryChanged = true
        return {
          ...item,
          ...(newName ? { name: newName } : {}),
          ...(nutrition
            ? {
                amountKcal: nutrition.amountKcal,
                proteinG: nutrition.proteinG,
                fatG: nutrition.fatG,
                carbsG: nutrition.carbsG,
                fiberG: nutrition.fiberG,
                amountG: nutrition.amountG,
                sodiumMg: nutrition.sodiumMg,
                potassiumMg: nutrition.potassiumMg,
                magnesiumMg: nutrition.magnesiumMg,
              }
            : {}),
        }
      })
      return mealChanged ? { ...meal, items } : meal
    })

    if (entryChanged) {
      entriesToUpsert.push({
        ...entry,
        calorieEntries,
        updatedAt: now,
      })
    }
  }

  return { entriesToUpsert, updatedItemCount }
}
