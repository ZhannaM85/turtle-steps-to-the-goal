import type { DailyEntry } from '@/domain/dailyEntry'

export type MealTimeBucket = 'morning' | 'afternoon' | 'evening' | 'night'

export const MEAL_TIME_BUCKETS: MealTimeBucket[] = [
  'morning',
  'afternoon',
  'evening',
  'night',
]

export interface MealTimeBucketTally {
  bucket: MealTimeBucket
  count: number
}

export interface MealTimeBucketResult {
  buckets: MealTimeBucketTally[]
  missingTimeCount: number
}

/**
 * Night starts at 23:00 — same cutoff as night-eating (#410). Morning
 * starts at 05:00 so 00:00–04:59 stays night, not morning.
 */
export function mealTimeBucket(hhmm: string): MealTimeBucket {
  if (hhmm >= '23:00' || hhmm < '05:00') return 'night'
  if (hhmm < '12:00') return 'morning'
  if (hhmm < '17:00') return 'afternoon'
  return 'evening'
}

/**
 * Meals with timeEaten in four clock buckets (#815). Untimed meals are
 * counted separately and never assigned a bucket.
 */
export function mealTimeBucketTallies(
  entries: DailyEntry[],
): MealTimeBucketResult {
  const counts: Record<MealTimeBucket, number> = {
    morning: 0,
    afternoon: 0,
    evening: 0,
    night: 0,
  }
  let missingTimeCount = 0

  for (const entry of entries) {
    for (const meal of entry.calorieEntries ?? []) {
      const time = meal.timeEaten?.trim()
      if (!time) {
        missingTimeCount += 1
        continue
      }
      counts[mealTimeBucket(time)] += 1
    }
  }

  return {
    buckets: MEAL_TIME_BUCKETS.map((bucket) => ({
      bucket,
      count: counts[bucket],
    })),
    missingTimeCount,
  }
}

export function hasTimedMeal(entries: DailyEntry[]): boolean {
  return entries.some((entry) =>
    (entry.calorieEntries ?? []).some((meal) => meal.timeEaten?.trim()),
  )
}
