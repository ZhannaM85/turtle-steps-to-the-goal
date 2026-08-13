import { addDays, format, parseISO } from 'date-fns'
import type { DailyEntry } from '@/domain/dailyEntry'
import { totalCalories } from '@/domain/dailyEntry'
import {
  classifyCorrelationStrength,
  DAILY_STRENGTH_THRESHOLDS_KG,
  type CorrelationStrength,
} from './correlationStrength'

export interface CalorieDayCorrelation {
  dayCount: number
  /** Calorie threshold splitting the "lower" and "higher" groups. */
  thresholdKcal: number
  lowerGroupAvgDeltaKg: number
  higherGroupAvgDeltaKg: number
  /** True when the lower-calorie half averaged more next-day gain. */
  lowerAveragedMoreGain: boolean
  /** #224 — plain-arithmetic strength label, see correlationStrength.ts. */
  strength: CorrelationStrength
}

const MIN_COMPARABLE_DAYS = 8

function average(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

export interface CalorieDayPoint {
  /** Day the calories (x-axis) were logged — #523 predictor-day convention. */
  date: string
  calories: number
  deltaKg: number
}

/**
 * #710 — day-pair calories vs next-day weight (replaces weekly
 * `correlationInsight` for the Dashboard card). Same shape as
 * `stepsPoints`/`sleepPoints`: each day's total calories paired with the
 * *next* calendar day's weight change. Needs weight + calories on the
 * predictor day and weight on the following day.
 */
export function calorieDayPoints(entries: DailyEntry[]): CalorieDayPoint[] {
  const byDate = new Map(entries.map((entry) => [entry.date, entry]))
  const points: CalorieDayPoint[] = []

  for (const entry of entries) {
    if (entry.weightKg === undefined) continue
    const calories = totalCalories(entry.calorieEntries, entry.dayTotals)
    if (calories === undefined) continue
    const nextDate = format(addDays(parseISO(entry.date), 1), 'yyyy-MM-dd')
    const nextEntry = byDate.get(nextDate)
    if (!nextEntry || nextEntry.weightKg === undefined) continue
    points.push({
      date: entry.date,
      calories,
      deltaKg: nextEntry.weightKg - entry.weightKg,
    })
  }

  return points
}

/**
 * Median-split on already-computed points (#224 outlier exclusion).
 */
export function calorieDayCorrelationFromPoints(
  points: CalorieDayPoint[],
): CalorieDayCorrelation | null {
  if (points.length < MIN_COMPARABLE_DAYS) return null

  const sorted = [...points].sort((a, b) => a.calories - b.calories)
  const mid = Math.ceil(sorted.length / 2)
  const lowerGroup = sorted.slice(0, mid)
  const higherGroup = sorted.slice(mid)
  if (higherGroup.length === 0) return null

  const lowerGroupAvgDeltaKg = average(lowerGroup.map((p) => p.deltaKg))
  const higherGroupAvgDeltaKg = average(higherGroup.map((p) => p.deltaKg))
  const rawThresholdKcal =
    (lowerGroup[lowerGroup.length - 1].calories + higherGroup[0].calories) / 2

  return {
    dayCount: points.length,
    thresholdKcal: Math.round(rawThresholdKcal / 50) * 50,
    lowerGroupAvgDeltaKg,
    higherGroupAvgDeltaKg,
    lowerAveragedMoreGain: lowerGroupAvgDeltaKg > higherGroupAvgDeltaKg,
    strength: classifyCorrelationStrength(
      higherGroupAvgDeltaKg - lowerGroupAvgDeltaKg,
      DAILY_STRENGTH_THRESHOLDS_KG,
    ),
  }
}

export function calorieDayCorrelation(
  entries: DailyEntry[],
): CalorieDayCorrelation | null {
  return calorieDayCorrelationFromPoints(calorieDayPoints(entries))
}
