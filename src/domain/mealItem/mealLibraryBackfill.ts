import type { DailyEntry } from '@/domain/dailyEntry'
import type { MealItem, MealItemSource } from './MealItem'

/** Soft cap so a multi-year MFP dump cannot silently create unbounded rows. */
export const MEAL_LIBRARY_BACKFILL_MAX_NEW = 8_000

export function normalizeMealLibraryName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase()
}

export interface MealLibraryBackfillCandidate {
  name: string
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

export interface MealLibraryBackfillPlan {
  candidates: MealLibraryBackfillCandidate[]
  /** Unique named dishes with kcal in history before applying the cap. */
  totalUniqueNamed: number
  truncated: boolean
}

/**
 * #541 — collect unique dish names from day meal history for the personal
 * library. Later dates win for casing + macros. Skips names already present
 * in `existingItems` (normalized). Does not mutate history.
 */
export function planMealLibraryBackfill(
  entries: readonly DailyEntry[],
  existingItems: readonly Pick<MealItem, 'name'>[],
  maxNew: number = MEAL_LIBRARY_BACKFILL_MAX_NEW,
): MealLibraryBackfillPlan {
  const existing = new Set(
    existingItems.map((item) => normalizeMealLibraryName(item.name)),
  )
  const byNorm = new Map<string, MealLibraryBackfillCandidate>()

  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))
  for (const entry of sorted) {
    for (const meal of entry.calorieEntries ?? []) {
      for (const item of meal.items ?? []) {
        const rawName = item.name?.trim()
        if (!rawName || !(item.amountKcal > 0)) continue
        const key = normalizeMealLibraryName(rawName)
        if (!key || existing.has(key)) continue
        byNorm.set(key, {
          name: rawName,
          amountKcal: item.amountKcal,
          proteinG: item.proteinG,
          fatG: item.fatG,
          carbsG: item.carbsG,
          fiberG: item.fiberG,
          amountG: item.amountG,
          sodiumMg: item.sodiumMg,
          potassiumMg: item.potassiumMg,
          magnesiumMg: item.magnesiumMg,
        })
      }
    }
  }

  const all = [...byNorm.values()].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
  )
  const truncated = all.length > maxNew
  return {
    candidates: truncated ? all.slice(0, maxNew) : all,
    totalUniqueNamed: all.length,
    truncated,
  }
}

export function isBackfilledMealItemSource(
  source: MealItemSource | undefined,
): boolean {
  return source === 'history-backfill' || source === 'mfp-import'
}
