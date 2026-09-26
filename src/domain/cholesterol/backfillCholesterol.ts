import type { CalorieEntry, DailyEntry } from '@/domain/dailyEntry'
import type { MealItem } from '@/domain/mealItem'
import { classifyFoodName } from './classifyFoodCholesterol'
import {
  isCholesterolImpact,
  type CholesterolClassification,
} from './cholesterolTypes'

/**
 * #1008 — retrospective LDL labels.
 *
 * IndexedDB v15 walks existing `dailyEntries` dishes and `mealItems` rows
 * in place. Each name is matched to `src/data/cholesterol-foods.json` by
 * exact string, or by trim + collapsed whitespace + case-fold. No fuzzy
 * match. Unmatched names become `unknown` and lose any reason. Only
 * `cholesterolImpact` and `cholesterolReason` are written — calories,
 * macros, grams, the meal, the date, and the time stay put. No rows are
 * inserted or deleted, so a second run ends on the same records. Saving a
 * day from the Day page stamps new dishes the same way; a name that is
 * not in the seed stays `unknown`. The JSON file is the only copy of the
 * mappings and can grow later without a code list.
 */

type CholesterolCarrier = {
  name?: string
  cholesterolImpact?: CholesterolClassification['cholesterolImpact']
  cholesterolReason?: string
}

export function withCholesterolClassification<T extends CholesterolCarrier>(
  record: T,
): T {
  const next = classifyFoodName(record.name)
  if (
    record.cholesterolImpact === next.cholesterolImpact &&
    record.cholesterolReason === next.cholesterolReason
  ) {
    return record
  }
  const copy: T = { ...record, cholesterolImpact: next.cholesterolImpact }
  if (next.cholesterolReason) copy.cholesterolReason = next.cholesterolReason
  else delete copy.cholesterolReason
  return copy
}

export function applyCholesterolInPlace(record: CholesterolCarrier): void {
  const next = withCholesterolClassification(record)
  if (next === record) return
  record.cholesterolImpact = next.cholesterolImpact
  if (next.cholesterolReason) record.cholesterolReason = next.cholesterolReason
  else delete record.cholesterolReason
}

export function backfillDailyEntryCholesterol(entry: DailyEntry): void {
  for (const meal of entry.calorieEntries ?? []) {
    for (const item of meal.items ?? []) applyCholesterolInPlace(item)
  }
}

export function backfillMealItemCholesterol(item: MealItem): void {
  applyCholesterolInPlace(item)
}

/** Day-page saves. Returns the same array when every dish is already stamped. */
export function stampCalorieEntriesCholesterol(
  entries: CalorieEntry[],
): CalorieEntry[] {
  let changed = false
  const next = entries.map((entry) => {
    let itemsChanged = false
    const items = entry.items.map((item) => {
      const stamped = withCholesterolClassification(item)
      if (stamped !== item) itemsChanged = true
      return stamped
    })
    if (!itemsChanged) return entry
    changed = true
    return { ...entry, items }
  })
  return changed ? next : entries
}

/** Stored label wins. A missing label is classified from the name (import
 * of an older backup, or a row the upgrade has not seen yet). */
export function cholesterolForFoodRecord(
  record: CholesterolCarrier,
): CholesterolClassification {
  if (
    record.cholesterolImpact &&
    isCholesterolImpact(record.cholesterolImpact)
  ) {
    return record.cholesterolReason
      ? {
          cholesterolImpact: record.cholesterolImpact,
          cholesterolReason: record.cholesterolReason,
        }
      : { cholesterolImpact: record.cholesterolImpact }
  }
  return classifyFoodName(record.name)
}
