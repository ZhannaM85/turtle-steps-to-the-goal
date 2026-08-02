import { addDays, format, parseISO } from 'date-fns'
import type { DailyEntry } from '@/domain/dailyEntry'
import {
  classifyCorrelationStrength,
  DAILY_STRENGTH_THRESHOLDS_KG,
  type CorrelationStrength,
} from './correlationStrength'

export interface MealFrequencyCorrelation {
  dayCount: number
  /** Meal-count threshold splitting the "fewer/larger meals" and "more/
   * smaller meals" groups. */
  thresholdMealCount: number
  fewerGroupAvgDeltaKg: number
  moreGroupAvgDeltaKg: number
  moreAveragedMoreGain: boolean
  strength: CorrelationStrength
}

const MIN_COMPARABLE_DAYS = 8

function average(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

export interface MealFrequencyPoint {
  /** Day the meal count (x-axis) was logged — #523, same predictor-day
   * navigation convention as `LateMealPoint.date`. Fasting still uses the
   * day the fast ends (`FastingWindowPoint.date`). */
  date: string
  mealCount: number
  deltaKg: number
}

/**
 * Each day's *number of logged meals* (distinct `CalorieEntry` groups, not
 * items — a meal with several dishes still counts once) paired with the
 * *next* calendar day's day-over-day weight change (#338) — e.g. "3 larger
 * meals vs. 5 smaller ones, does the count itself relate to next-day
 * weight?" Distinct from #257's fasting-window correlation (meal *timing*)
 * and #322's protein-share correlation (meal *composition*) — this is
 * about meal *count*, derived from data already logged, no new manual
 * entry needed. A day only contributes a point if it has a logged weight,
 * at least one meal logged, and the very next calendar date also has a
 * logged weight — same two-endpoints requirement `lateMealPoints` uses.
 */
export function mealFrequencyPoints(entries: DailyEntry[]): MealFrequencyPoint[] {
  const byDate = new Map(entries.map((entry) => [entry.date, entry]))
  const points: MealFrequencyPoint[] = []

  for (const entry of entries) {
    if (entry.weightKg === undefined) continue
    const mealCount = entry.calorieEntries?.length ?? 0
    if (mealCount === 0) continue
    const nextDate = format(addDays(parseISO(entry.date), 1), 'yyyy-MM-dd')
    const nextEntry = byDate.get(nextDate)
    if (!nextEntry || nextEntry.weightKg === undefined) continue
    points.push({
      date: entry.date,
      mealCount,
      deltaKg: nextEntry.weightKg - entry.weightKg,
    })
  }

  return points
}

/**
 * The median-split math on its own, taking already-computed points — same
 * "view filters manually-excluded outliers first" split `lateMealCorrelationFromPoints`
 * uses, this function doesn't know exclusion exists at all.
 */
export function mealFrequencyCorrelationFromPoints(
  points: MealFrequencyPoint[],
): MealFrequencyCorrelation | null {
  if (points.length < MIN_COMPARABLE_DAYS) return null

  const sorted = [...points].sort((a, b) => a.mealCount - b.mealCount)
  const mid = Math.ceil(sorted.length / 2)
  const fewerGroup = sorted.slice(0, mid)
  const moreGroup = sorted.slice(mid)
  if (moreGroup.length === 0) return null

  const fewerGroupAvgDeltaKg = average(fewerGroup.map((p) => p.deltaKg))
  const moreGroupAvgDeltaKg = average(moreGroup.map((p) => p.deltaKg))
  const rawThresholdMealCount =
    (fewerGroup[fewerGroup.length - 1].mealCount + moreGroup[0].mealCount) / 2

  return {
    dayCount: points.length,
    thresholdMealCount: Math.round(rawThresholdMealCount),
    fewerGroupAvgDeltaKg,
    moreGroupAvgDeltaKg,
    moreAveragedMoreGain: moreGroupAvgDeltaKg > fewerGroupAvgDeltaKg,
    strength: classifyCorrelationStrength(
      moreGroupAvgDeltaKg - fewerGroupAvgDeltaKg,
      DAILY_STRENGTH_THRESHOLDS_KG,
    ),
  }
}

/**
 * A plain-arithmetic, non-AI "pattern" summary, same shape as
 * `lateMealCorrelation`/`fastingWindowCorrelation`: splits
 * `mealFrequencyPoints`' comparable day-pairs into a fewer-meals and
 * more-meals half by median, and reports which half averaged more next-day
 * gain. Requires MIN_COMPARABLE_DAYS pairs. Returns null otherwise.
 */
export function mealFrequencyCorrelation(
  entries: DailyEntry[],
): MealFrequencyCorrelation | null {
  return mealFrequencyCorrelationFromPoints(mealFrequencyPoints(entries))
}
