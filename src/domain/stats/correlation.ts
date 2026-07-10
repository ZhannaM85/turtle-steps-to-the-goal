import type { DailyEntry } from '@/domain/dailyEntry'
import { weeklySummaries } from './weeklySummaries'

/**
 * Pearson correlation coefficient between weekly average calories and that
 * week's weight change (vs. the prior week). Positive means higher calories
 * tracked with less loss (or more gain); negative means higher calories
 * tracked with more loss. Returns null when there isn't enough data to say
 * anything (fewer than two comparable weeks, or no variance in either axis).
 */
export function correlation(entries: DailyEntry[]): number | null {
  const weeks = weeklySummaries(entries)
  const points = weeks
    .filter((w) => w.averageCalories !== null && w.deltaVsPriorWeekKg !== null)
    .map((w) => ({
      calories: w.averageCalories as number,
      delta: w.deltaVsPriorWeekKg as number,
    }))

  if (points.length < 2) return null

  const meanCalories =
    points.reduce((sum, p) => sum + p.calories, 0) / points.length
  const meanDelta = points.reduce((sum, p) => sum + p.delta, 0) / points.length

  let numerator = 0
  let sumSqCalories = 0
  let sumSqDelta = 0

  for (const point of points) {
    const dx = point.calories - meanCalories
    const dy = point.delta - meanDelta
    numerator += dx * dy
    sumSqCalories += dx * dx
    sumSqDelta += dy * dy
  }

  const denominator = Math.sqrt(sumSqCalories * sumSqDelta)
  if (denominator === 0) return null // no variance in calories and/or weight change

  return numerator / denominator
}
