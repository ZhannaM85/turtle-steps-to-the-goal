import type { DailyEntry } from '@/domain/dailyEntry'
import { mealEatingReasons } from '@/domain/dailyEntry'

export interface EatingReasonTally {
  reason: string
  count: number
}

/**
 * How often each eating reason was picked on meals in `entries` (#814).
 * Multi-pick meals (#774) increment every selected reason. Unset meals
 * contribute nothing.
 */
export function eatingReasonTallies(
  entries: DailyEntry[],
): EatingReasonTally[] {
  const byReason = new Map<string, number>()

  for (const entry of entries) {
    for (const meal of entry.calorieEntries ?? []) {
      for (const reason of mealEatingReasons(meal)) {
        byReason.set(reason, (byReason.get(reason) ?? 0) + 1)
      }
    }
  }

  return [...byReason.entries()]
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => {
      const scoreDiff = b.count - a.count
      return scoreDiff !== 0 ? scoreDiff : a.reason.localeCompare(b.reason)
    })
}
