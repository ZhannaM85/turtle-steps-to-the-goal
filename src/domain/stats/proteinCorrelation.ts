import { addDays, format, parseISO } from 'date-fns'
import { totalProtein, type DailyEntry } from '@/domain/dailyEntry'
import {
  classifyCorrelationStrength,
  DAILY_STRENGTH_THRESHOLDS_KG,
  type CorrelationStrength,
} from './correlationStrength'

export interface ProteinCorrelation {
  dayCount: number
  /** Protein-grams threshold splitting the "less" and "more" groups. */
  thresholdProteinG: number
  lessGroupAvgDeltaKg: number
  moreGroupAvgDeltaKg: number
  lessAveragedMoreGain: boolean
  /** #224 — plain-arithmetic strength label, see correlationStrength.ts. */
  strength: CorrelationStrength
}

const MIN_COMPARABLE_DAYS = 8

function average(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

export interface ProteinPoint {
  proteinG: number
  deltaKg: number
}

/**
 * Same day-pairing shape as `sleepPoints`/`stepsPoints` (#167, extending the
 * pattern #116 established) — each day's logged protein total paired with
 * the *next* calendar day's weight change. A day only contributes a point if
 * it has a logged weight, a logged protein total (via `totalProtein`), and
 * the very next calendar date also has a logged weight.
 */
export function proteinPoints(entries: DailyEntry[]): ProteinPoint[] {
  const byDate = new Map(entries.map((entry) => [entry.date, entry]))
  const points: ProteinPoint[] = []

  for (const entry of entries) {
    if (entry.weightKg === undefined) continue
    const proteinG = totalProtein(entry.calorieEntries)
    if (proteinG === undefined) continue
    const nextDate = format(addDays(parseISO(entry.date), 1), 'yyyy-MM-dd')
    const nextEntry = byDate.get(nextDate)
    if (!nextEntry || nextEntry.weightKg === undefined) continue
    points.push({
      proteinG,
      deltaKg: nextEntry.weightKg - entry.weightKg,
    })
  }

  return points
}

/**
 * Plain-arithmetic median-split summary, same shape as `sleepCorrelation`/
 * `stepsCorrelation` — splits `proteinPoints`' comparable day-pairs into a
 * less-protein and more-protein half by median grams, and reports which
 * half averaged more next-day gain. Requires MIN_COMPARABLE_DAYS pairs.
 * Returns null otherwise.
 */
export function proteinCorrelation(
  entries: DailyEntry[],
): ProteinCorrelation | null {
  const points = proteinPoints(entries)

  if (points.length < MIN_COMPARABLE_DAYS) return null

  const sorted = [...points].sort((a, b) => a.proteinG - b.proteinG)
  const mid = Math.ceil(sorted.length / 2)
  const lessGroup = sorted.slice(0, mid)
  const moreGroup = sorted.slice(mid)
  if (moreGroup.length === 0) return null

  const lessGroupAvgDeltaKg = average(lessGroup.map((p) => p.deltaKg))
  const moreGroupAvgDeltaKg = average(moreGroup.map((p) => p.deltaKg))
  const rawThresholdProteinG =
    (lessGroup[lessGroup.length - 1].proteinG + moreGroup[0].proteinG) / 2

  return {
    dayCount: points.length,
    thresholdProteinG: Math.round(rawThresholdProteinG / 5) * 5,
    lessGroupAvgDeltaKg,
    moreGroupAvgDeltaKg,
    lessAveragedMoreGain: lessGroupAvgDeltaKg > moreGroupAvgDeltaKg,
    strength: classifyCorrelationStrength(
      moreGroupAvgDeltaKg - lessGroupAvgDeltaKg,
      DAILY_STRENGTH_THRESHOLDS_KG,
    ),
  }
}
