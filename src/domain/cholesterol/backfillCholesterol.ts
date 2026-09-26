import type { CalorieEntry, DailyEntry } from '@/domain/dailyEntry'
import type { MealItem } from '@/domain/mealItem'
import {
  cholesterolMatchKey,
  classifyFoodName,
} from './classifyFoodCholesterol'
import {
  isCholesterolImpact,
  type CholesterolClassification,
} from './cholesterolTypes'

/**
 * #1008 — retrospective LDL labels. IndexedDB v15 walks existing dishes
 * and library foods. #1009 — v16 runs the same stamp so a catalog food
 * picks up its Russian reason.
 *
 * #1011 — the catalog is the only name lookup. A row that already has
 * `cholesterolImpact` keeps that stamp when the catalog has no label for
 * the name, so a later save does not clear history. A renamed dish is
 * classified again. Only `cholesterolImpact` and `cholesterolReason` are
 * written — calories, macros, grams, the meal, the date, and the time
 * stay put. No rows are inserted or deleted.
 */

type CholesterolCarrier = {
  name?: string
  cholesterolImpact?: CholesterolClassification['cholesterolImpact']
  cholesterolReason?: string
}

function catalogHasLabel(classification: CholesterolClassification): boolean {
  return (
    classification.cholesterolImpact !== 'unknown' ||
    Boolean(classification.cholesterolReason)
  )
}

function hasStoredLabel(record: CholesterolCarrier): boolean {
  return Boolean(
    record.cholesterolImpact && isCholesterolImpact(record.cholesterolImpact),
  )
}

function withoutCholesterol<T extends CholesterolCarrier>(record: T): T {
  if (
    record.cholesterolImpact === undefined &&
    record.cholesterolReason === undefined
  ) {
    return record
  }
  const copy: T = { ...record }
  delete copy.cholesterolImpact
  delete copy.cholesterolReason
  return copy
}

function applyClassification<T extends CholesterolCarrier>(
  record: T,
  next: CholesterolClassification,
): T {
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

export function withCholesterolClassification<T extends CholesterolCarrier>(
  record: T,
  previousName?: string,
): T {
  const nameChanged =
    previousName !== undefined &&
    cholesterolMatchKey(previousName) !== cholesterolMatchKey(record.name ?? '')
  const base = nameChanged ? withoutCholesterol(record) : record
  const next = classifyFoodName(base.name)
  if (!catalogHasLabel(next) && hasStoredLabel(base)) return base
  return applyClassification(base, next)
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

/** An edit rebuilds the dish without LDL fields. Copy the stored stamp
 * back when the id and the name still match, before catalog classification. */
function retainStoredCholesterol(
  previous: readonly CalorieEntry[],
  next: CalorieEntry[],
): CalorieEntry[] {
  const byId = new Map<string, CholesterolCarrier>()
  for (const entry of previous) {
    for (const item of entry.items) byId.set(item.id, item)
  }
  let changed = false
  const merged = next.map((entry) => {
    let itemsChanged = false
    const items = entry.items.map((item) => {
      const prior = byId.get(item.id)
      if (!prior || !hasStoredLabel(prior) || hasStoredLabel(item)) return item
      if (
        cholesterolMatchKey(prior.name ?? '') !==
        cholesterolMatchKey(item.name ?? '')
      ) {
        return item
      }
      itemsChanged = true
      const copy = { ...item, cholesterolImpact: prior.cholesterolImpact }
      if (prior.cholesterolReason) copy.cholesterolReason = prior.cholesterolReason
      return copy
    })
    if (!itemsChanged) return entry
    changed = true
    return { ...entry, items }
  })
  return changed ? merged : next
}

/** Day-page saves. Returns the same array when every dish is already stamped. */
export function stampCalorieEntriesCholesterol(
  entries: CalorieEntry[],
  previous?: readonly CalorieEntry[],
): CalorieEntry[] {
  const source = previous ? retainStoredCholesterol(previous, entries) : entries
  let changed = false
  const next = source.map((entry) => {
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
  return changed ? next : source
}

/** Stored label wins. A missing label is classified from the catalog (or
 * stays `unknown`). */
export function cholesterolForFoodRecord(
  record: CholesterolCarrier,
): CholesterolClassification {
  const impact = record.cholesterolImpact
  if (impact && isCholesterolImpact(impact)) {
    return record.cholesterolReason
      ? {
          cholesterolImpact: impact,
          cholesterolReason: record.cholesterolReason,
        }
      : { cholesterolImpact: impact }
  }
  return classifyFoodName(record.name)
}
