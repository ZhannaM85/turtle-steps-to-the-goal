import type { Day } from 'date-fns'
import type { DailyEntry } from '@/domain/dailyEntry'
import {
  classifyCorrelationStrength,
  WEEKLY_STRENGTH_THRESHOLDS_KG,
  type CorrelationStrength,
} from './correlationStrength'
import { weeklySummaries } from './weeklySummaries'

export interface CorrelationInsight {
  weekCount: number
  thresholdKcal: number
  lowerGroupAvgDeltaKg: number
  higherGroupAvgDeltaKg: number
  lowerAveragedMoreLoss: boolean
  /** #224 — plain-arithmetic strength label, see correlationStrength.ts. */
  strength: CorrelationStrength
}

const MIN_COMPARABLE_WEEKS = 4

function average(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

/**
 * A plain-arithmetic, non-AI "pattern" summary: splits comparable weeks
 * (weeks with both an average-calorie figure and a delta vs. the prior
 * week) into a lower-calorie and a higher-calorie half by median, and
 * reports which half averaged more loss. Requires at least
 * MIN_COMPARABLE_WEEKS so each half has a couple of weeks behind it,
 * rather than a single-week coin flip. Returns null otherwise.
 *
 * This compares each week's *average* calories to that *same week's*
 * change, not same-day figures — weight lags calorie intake by more than
 * a day (digestion/water/glycogen), so a day-level comparison would be
 * measuring the wrong thing. Week-level averaging is the reasonable
 * proxy; callers should still word any copy with that lag in mind.
 */
export function correlationInsight(
  entries: DailyEntry[],
  weekStartsOn: Day = 1,
): CorrelationInsight | null {
  const weeks = weeklySummaries(entries, undefined, weekStartsOn)
  const points = weeks
    .filter((w) => w.averageCalories !== null && w.deltaVsPriorWeekKg !== null)
    .map((w) => ({
      calories: w.averageCalories as number,
      delta: w.deltaVsPriorWeekKg as number,
    }))

  if (points.length < MIN_COMPARABLE_WEEKS) return null

  const sorted = [...points].sort((a, b) => a.calories - b.calories)
  const mid = Math.ceil(sorted.length / 2)
  const lowerGroup = sorted.slice(0, mid)
  const higherGroup = sorted.slice(mid)
  if (higherGroup.length === 0) return null

  const lowerGroupAvgDeltaKg = average(lowerGroup.map((p) => p.delta))
  const higherGroupAvgDeltaKg = average(higherGroup.map((p) => p.delta))
  const rawThreshold =
    (lowerGroup[lowerGroup.length - 1].calories + higherGroup[0].calories) / 2

  return {
    weekCount: points.length,
    thresholdKcal: Math.round(rawThreshold / 50) * 50,
    lowerGroupAvgDeltaKg,
    higherGroupAvgDeltaKg,
    lowerAveragedMoreLoss: lowerGroupAvgDeltaKg < higherGroupAvgDeltaKg,
    strength: classifyCorrelationStrength(
      higherGroupAvgDeltaKg - lowerGroupAvgDeltaKg,
      WEEKLY_STRENGTH_THRESHOLDS_KG,
    ),
  }
}
