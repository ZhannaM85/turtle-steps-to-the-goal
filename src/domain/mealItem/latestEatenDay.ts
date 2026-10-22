import type { DailyEntry } from '@/domain/dailyEntry'
import { normalizeMealLibraryName } from './mealLibraryBackfill'

/**
 * #1111 — latest diary day (YYYY-MM-DD) for each normalized food name.
 * Day logs are the source of truth. `MealItem.updatedAt` also moves on
 * rename, favorite, barcode, brand, and servings, so it is not last eaten.
 * A library rename does not rewrite old logs, so the date follows lines
 * that still use the current name.
 */
export function latestEatenDayByNormalizedName(
  entries: readonly DailyEntry[],
): Map<string, string> {
  const latest = new Map<string, string>()
  for (const entry of entries) {
    const day = entry.date
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue
    for (const meal of entry.calorieEntries ?? []) {
      for (const item of meal.items ?? []) {
        const raw = item.name?.trim()
        if (!raw) continue
        const key = normalizeMealLibraryName(raw)
        if (!key) continue
        const prev = latest.get(key)
        if (!prev || day > prev) latest.set(key, day)
      }
    }
  }
  return latest
}
