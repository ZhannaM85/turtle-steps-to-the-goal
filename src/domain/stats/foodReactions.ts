import type { DailyEntry } from '@/domain/dailyEntry'

export interface FoodReactionTally {
  name: string
  bellissimoCount: number
  thumbsUpCount: number
  thumbsDownCount: number
}

const TOP_FOODS_LIMIT = 5

/**
 * Tallies every logged dish's reactions (#129 — per-item, not per-meal) by
 * name across all entries. A dish logged under the same name multiple times
 * (e.g. "Pizza" ordered several times) accumulates into one tally, not one
 * per occurrence — this is about the food, not any single meal it appeared
 * in. Unnamed items and items with no reaction logged are skipped; there's
 * nothing to group or count for either.
 */
export function foodReactionTallies(
  entries: DailyEntry[],
): FoodReactionTally[] {
  const byName = new Map<string, FoodReactionTally>()

  for (const entry of entries) {
    for (const meal of entry.calorieEntries ?? []) {
      for (const item of meal.items) {
        const name = item.name?.trim()
        if (!name || !item.emotion) continue
        const tally = byName.get(name) ?? {
          name,
          bellissimoCount: 0,
          thumbsUpCount: 0,
          thumbsDownCount: 0,
        }
        if (item.emotion === 'bellissimo') tally.bellissimoCount++
        else if (item.emotion === 'thumbsUp') tally.thumbsUpCount++
        else if (item.emotion === 'thumbsDown') tally.thumbsDownCount++
        byName.set(name, tally)
      }
    }
  }

  return [...byName.values()]
}

/**
 * Top positively-reacted foods, ranked by a bellissimo-weighted positive
 * count (bellissimo counts double thumbsUp — a "this was amazing" is a
 * stronger signal than a plain thumbs up, #54's own framing for the tier),
 * ties broken by raw bellissimo count. A food with only negative reactions
 * logged is excluded outright rather than ranked at the bottom — 0 positive
 * reactions isn't "liked less than everything else that has at least one."
 */
export function mostLikedFoods(entries: DailyEntry[]): FoodReactionTally[] {
  return foodReactionTallies(entries)
    .filter((f) => f.bellissimoCount + f.thumbsUpCount > 0)
    .sort((a, b) => {
      const scoreDiff =
        b.bellissimoCount * 2 +
        b.thumbsUpCount -
        (a.bellissimoCount * 2 + a.thumbsUpCount)
      return scoreDiff !== 0 ? scoreDiff : b.bellissimoCount - a.bellissimoCount
    })
    .slice(0, TOP_FOODS_LIMIT)
}

/** Top negatively-reacted foods, ranked by thumbsDown count. A food that's
 * sometimes loved and sometimes disliked (different meals, different
 * verdicts) can legitimately appear in both this and `mostLikedFoods` —
 * that's real mixed history, not double-counting. */
export function mostDislikedFoods(entries: DailyEntry[]): FoodReactionTally[] {
  return foodReactionTallies(entries)
    .filter((f) => f.thumbsDownCount > 0)
    .sort((a, b) => b.thumbsDownCount - a.thumbsDownCount)
    .slice(0, TOP_FOODS_LIMIT)
}
