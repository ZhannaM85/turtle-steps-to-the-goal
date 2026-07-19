import { addDays, format, parseISO } from 'date-fns'
import type { DailyEntry } from '@/domain/dailyEntry'

export interface StepsCorrelation {
  dayCount: number
  /** Step-count threshold splitting the "fewer" and "more" groups. */
  thresholdSteps: number
  fewerGroupAvgDeltaKg: number
  moreGroupAvgDeltaKg: number
  fewerAveragedMoreGain: boolean
}

const MIN_COMPARABLE_DAYS = 8

function average(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

export interface StepsPoint {
  steps: number
  deltaKg: number
}

/**
 * Same day-pairing shape as `lateMealPoints`/`sleepPoints` (#167) — each
 * day's logged `steps` paired with the *next* calendar day's weight change.
 * A day only contributes a point if it has a logged weight, a logged
 * `steps` count, and the very next calendar date also has a logged weight.
 */
export function stepsPoints(entries: DailyEntry[]): StepsPoint[] {
  const byDate = new Map(entries.map((entry) => [entry.date, entry]))
  const points: StepsPoint[] = []

  for (const entry of entries) {
    if (entry.weightKg === undefined || entry.steps === undefined) continue
    const nextDate = format(addDays(parseISO(entry.date), 1), 'yyyy-MM-dd')
    const nextEntry = byDate.get(nextDate)
    if (!nextEntry || nextEntry.weightKg === undefined) continue
    points.push({
      steps: entry.steps,
      deltaKg: nextEntry.weightKg - entry.weightKg,
    })
  }

  return points
}

/**
 * Plain-arithmetic median-split summary, same shape as `lateMealCorrelation`/
 * `sleepCorrelation` — splits `stepsPoints`' comparable day-pairs into a
 * fewer-steps and more-steps half by median count, and reports which half
 * averaged more next-day gain. Requires MIN_COMPARABLE_DAYS pairs. Returns
 * null otherwise.
 */
export function stepsCorrelation(entries: DailyEntry[]): StepsCorrelation | null {
  const points = stepsPoints(entries)

  if (points.length < MIN_COMPARABLE_DAYS) return null

  const sorted = [...points].sort((a, b) => a.steps - b.steps)
  const mid = Math.ceil(sorted.length / 2)
  const fewerGroup = sorted.slice(0, mid)
  const moreGroup = sorted.slice(mid)
  if (moreGroup.length === 0) return null

  const fewerGroupAvgDeltaKg = average(fewerGroup.map((p) => p.deltaKg))
  const moreGroupAvgDeltaKg = average(moreGroup.map((p) => p.deltaKg))
  const rawThresholdSteps =
    (fewerGroup[fewerGroup.length - 1].steps + moreGroup[0].steps) / 2

  return {
    dayCount: points.length,
    thresholdSteps: Math.round(rawThresholdSteps / 100) * 100,
    fewerGroupAvgDeltaKg,
    moreGroupAvgDeltaKg,
    fewerAveragedMoreGain: fewerGroupAvgDeltaKg > moreGroupAvgDeltaKg,
  }
}
