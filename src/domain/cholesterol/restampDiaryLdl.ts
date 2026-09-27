import type { CalorieItem, DailyEntry } from '@/domain/dailyEntry'
import { cholesterolMatchKey } from './classifyFoodCholesterol'
import {
  isCholesterolImpact,
  type CholesterolImpact,
} from './cholesterolTypes'

/**
 * #1020 — catalog LDL applied onto diary rows that already use this food's
 * name. `names` is the Russian name plus the English name and any paste
 * aliases. Match is the same whole-name key as other catalog→diary LDL
 * lookups (`cholesterolMatchKey`), not a substring.
 */
export interface DiaryLdlStamp {
  names: readonly string[]
  cholesterolImpact: CholesterolImpact
  cholesterolReason?: string
}

export interface DiaryLdlRestampResult {
  /** Days that need saving. Unchanged days are omitted. */
  entriesToUpsert: DailyEntry[]
  updatedItemCount: number
}

type LdlCarrier = {
  cholesterolImpact?: CholesterolImpact
  cholesterolReason?: string
}

function reasonOf(record: LdlCarrier | undefined): string | undefined {
  const reason = record?.cholesterolReason?.trim()
  return reason || undefined
}

/** True when the catalog row's LDL impact or reason actually changed. */
export function catalogLdlChanged(
  previous: LdlCarrier | undefined,
  next: LdlCarrier,
): boolean {
  if (!next.cholesterolImpact || !isCholesterolImpact(next.cholesterolImpact)) {
    return false
  }
  const prevImpact =
    previous?.cholesterolImpact && isCholesterolImpact(previous.cholesterolImpact)
      ? previous.cholesterolImpact
      : 'unknown'
  return (
    prevImpact !== next.cholesterolImpact ||
    reasonOf(previous) !== reasonOf(next)
  )
}

function sameStamp(a: DiaryLdlStamp, b: DiaryLdlStamp): boolean {
  return (
    a.cholesterolImpact === b.cholesterolImpact &&
    reasonOf(a) === reasonOf(b)
  )
}

function indexStamps(
  stamps: readonly DiaryLdlStamp[],
): Map<string, DiaryLdlStamp | 'ambiguous'> {
  const index = new Map<string, DiaryLdlStamp | 'ambiguous'>()
  for (const stamp of stamps) {
    if (!isCholesterolImpact(stamp.cholesterolImpact)) continue
    for (const name of stamp.names) {
      const key = cholesterolMatchKey(name)
      if (!key) continue
      const prev = index.get(key)
      if (!prev) index.set(key, stamp)
      else if (prev === 'ambiguous' || !sameStamp(prev, stamp)) {
        index.set(key, 'ambiguous')
      }
    }
  }
  return index
}

function applyStamp(item: CalorieItem, stamp: DiaryLdlStamp): CalorieItem {
  const reason = reasonOf(stamp)
  if (
    item.cholesterolImpact === stamp.cholesterolImpact &&
    reasonOf(item) === reason
  ) {
    return item
  }
  const copy: CalorieItem = {
    ...item,
    cholesterolImpact: stamp.cholesterolImpact,
  }
  if (reason) copy.cholesterolReason = reason
  else delete copy.cholesterolReason
  return copy
}

/**
 * Writes the catalog LDL onto matching dishes. Calories, macros, grams,
 * names, and meal times stay as logged. A name claimed by two different
 * LDL values is left alone.
 */
export function restampDiaryLdl(
  entries: readonly DailyEntry[],
  stamps: readonly DiaryLdlStamp[],
): DiaryLdlRestampResult {
  const index = indexStamps(stamps)
  if (index.size === 0) return { entriesToUpsert: [], updatedItemCount: 0 }

  const entriesToUpsert: DailyEntry[] = []
  let updatedItemCount = 0
  const now = new Date().toISOString()

  for (const entry of entries) {
    let entryChanged = false
    const calorieEntries = (entry.calorieEntries ?? []).map((meal) => {
      let mealChanged = false
      const items = (meal.items ?? []).map((item) => {
        const key = cholesterolMatchKey(item.name ?? '')
        if (!key) return item
        const stamp = index.get(key)
        if (!stamp || stamp === 'ambiguous') return item
        const next = applyStamp(item, stamp)
        if (next === item) return item
        updatedItemCount += 1
        mealChanged = true
        entryChanged = true
        return next
      })
      return mealChanged ? { ...meal, items } : meal
    })
    if (entryChanged) {
      entriesToUpsert.push({ ...entry, calorieEntries, updatedAt: now })
    }
  }

  return { entriesToUpsert, updatedItemCount }
}
