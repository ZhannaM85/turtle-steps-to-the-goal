import { addDays, format, parseISO } from 'date-fns'
import type { DailyEntry } from '@/domain/dailyEntry'

export interface SleepCorrelation {
  dayCount: number
  /** Sleep-hours threshold splitting the "less" and "more" groups. */
  thresholdHours: number
  lessGroupAvgDeltaKg: number
  moreGroupAvgDeltaKg: number
  lessAveragedMoreGain: boolean
}

const MIN_COMPARABLE_DAYS = 8

function average(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

export interface SleepPoint {
  hours: number
  deltaKg: number
}

/**
 * Same day-pairing shape as `lateMealPoints` (#167, extending the pattern
 * #116 established) — each day's logged `sleepHours` paired with the *next*
 * calendar day's weight change. A day only contributes a point if it has a
 * logged weight, a logged `sleepHours`, and the very next calendar date also
 * has a logged weight.
 */
export function sleepPoints(entries: DailyEntry[]): SleepPoint[] {
  const byDate = new Map(entries.map((entry) => [entry.date, entry]))
  const points: SleepPoint[] = []

  for (const entry of entries) {
    if (entry.weightKg === undefined || entry.sleepHours === undefined) {
      continue
    }
    const nextDate = format(addDays(parseISO(entry.date), 1), 'yyyy-MM-dd')
    const nextEntry = byDate.get(nextDate)
    if (!nextEntry || nextEntry.weightKg === undefined) continue
    points.push({
      hours: entry.sleepHours,
      deltaKg: nextEntry.weightKg - entry.weightKg,
    })
  }

  return points
}

/**
 * Plain-arithmetic median-split summary, same shape as `lateMealCorrelation`
 * — splits `sleepPoints`' comparable day-pairs into a less-sleep and
 * more-sleep half by median hours, and reports which half averaged more
 * next-day gain. Requires MIN_COMPARABLE_DAYS pairs. Returns null otherwise.
 */
export function sleepCorrelation(entries: DailyEntry[]): SleepCorrelation | null {
  const points = sleepPoints(entries)

  if (points.length < MIN_COMPARABLE_DAYS) return null

  const sorted = [...points].sort((a, b) => a.hours - b.hours)
  const mid = Math.ceil(sorted.length / 2)
  const lessGroup = sorted.slice(0, mid)
  const moreGroup = sorted.slice(mid)
  if (moreGroup.length === 0) return null

  const lessGroupAvgDeltaKg = average(lessGroup.map((p) => p.deltaKg))
  const moreGroupAvgDeltaKg = average(moreGroup.map((p) => p.deltaKg))
  const rawThresholdHours =
    (lessGroup[lessGroup.length - 1].hours + moreGroup[0].hours) / 2

  return {
    dayCount: points.length,
    thresholdHours: Math.round(rawThresholdHours * 2) / 2,
    lessGroupAvgDeltaKg,
    moreGroupAvgDeltaKg,
    lessAveragedMoreGain: lessGroupAvgDeltaKg > moreGroupAvgDeltaKg,
  }
}
