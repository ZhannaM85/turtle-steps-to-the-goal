import type { DailyEntry } from '@/domain/dailyEntry'

export interface FoodFrequencyTally {
  name: string
  count: number
  kcal: number
}

export type FoodFrequencyRankBy = 'count' | 'kcal'

const TOP_FOODS_LIMIT = 8

/**
 * Times each named dish was logged (#812), plus summed amountKcal (#813).
 * Grouped by trimmed CalorieItem.name — logged items have no library id.
 * Unnamed items are skipped. dayTotals are ignored (no names).
 */
export function foodFrequencyTallies(
  entries: DailyEntry[],
): FoodFrequencyTally[] {
  const byName = new Map<string, FoodFrequencyTally>()

  for (const entry of entries) {
    for (const meal of entry.calorieEntries ?? []) {
      for (const item of meal.items) {
        const name = item.name?.trim()
        if (!name) continue
        const tally = byName.get(name) ?? { name, count: 0, kcal: 0 }
        tally.count += 1
        tally.kcal += item.amountKcal
        byName.set(name, tally)
      }
    }
  }

  return [...byName.values()]
}

/** Top dishes by times logged or by summed kcal, ties broken by name. */
export function mostEatenFoods(
  entries: DailyEntry[],
  rankBy: FoodFrequencyRankBy = 'count',
  limit = TOP_FOODS_LIMIT,
): FoodFrequencyTally[] {
  return foodFrequencyTallies(entries)
    .sort((a, b) => {
      const scoreDiff = rankBy === 'kcal' ? b.kcal - a.kcal : b.count - a.count
      return scoreDiff !== 0 ? scoreDiff : a.name.localeCompare(b.name)
    })
    .slice(0, limit)
}
