import { addDays, format, parseISO } from 'date-fns'
import type { DailyEntry } from '@/domain/dailyEntry'
import {
  classifyCorrelationStrength,
  DAILY_STRENGTH_THRESHOLDS_KG,
  type CorrelationStrength,
} from './correlationStrength'

export interface AlcoholCorrelation {
  dayCount: number
  alcoholGroupAvgDeltaKg: number
  noAlcoholGroupAvgDeltaKg: number
  alcoholAveragedMoreGain: boolean
  strength: CorrelationStrength
}

const MIN_COMPARABLE_DAYS = 8

function average(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

export interface AlcoholPoint {
  /** Day the alcohol signal (x-axis) was logged — same predictor-day
   * navigation convention as `NightEatingPoint.date`/`LateMealPoint.date`. */
  date: string
  hadAlcohol: boolean
  deltaKg: number
}

/**
 * Each day's logged `hadAlcohol` value (#607, a plain opt-in day signal —
 * no derivation, unlike `hadNightEating()`) paired with the *next* calendar
 * day's day-over-day weight change — "does an alcohol day relate to
 * next-day weight?" Same two-endpoints requirement every other day-pairing
 * correlation in this folder uses: a day only contributes a point if it has
 * a logged weight, a *definite* `hadAlcohol` value (`undefined` — never
 * logged either way — is skipped, not folded into the "No" group), and the
 * very next calendar date also has a logged weight.
 */
export function alcoholPoints(entries: DailyEntry[]): AlcoholPoint[] {
  const byDate = new Map(entries.map((entry) => [entry.date, entry]))
  const points: AlcoholPoint[] = []

  for (const entry of entries) {
    if (entry.weightKg === undefined) continue
    if (entry.hadAlcohol === undefined) continue
    const nextDate = format(addDays(parseISO(entry.date), 1), 'yyyy-MM-dd')
    const nextEntry = byDate.get(nextDate)
    if (!nextEntry || nextEntry.weightKg === undefined) continue
    points.push({
      date: entry.date,
      hadAlcohol: entry.hadAlcohol,
      deltaKg: nextEntry.weightKg - entry.weightKg,
    })
  }

  return points
}

/**
 * The group-average math on its own, taking already-computed points — same
 * "view filters manually-excluded outliers first" split every other
 * `*CorrelationFromPoints` function in this folder uses. A plain two-group
 * comparison (alcohol days vs. not), not a median split — the predictor
 * here is already boolean, same shape as `nightEatingCorrelationFromPoints`.
 */
export function alcoholCorrelationFromPoints(
  points: AlcoholPoint[],
): AlcoholCorrelation | null {
  if (points.length < MIN_COMPARABLE_DAYS) return null

  const alcoholGroup = points.filter((p) => p.hadAlcohol)
  const noAlcoholGroup = points.filter((p) => !p.hadAlcohol)
  if (alcoholGroup.length === 0 || noAlcoholGroup.length === 0) return null

  const alcoholGroupAvgDeltaKg = average(alcoholGroup.map((p) => p.deltaKg))
  const noAlcoholGroupAvgDeltaKg = average(
    noAlcoholGroup.map((p) => p.deltaKg),
  )

  return {
    dayCount: points.length,
    alcoholGroupAvgDeltaKg,
    noAlcoholGroupAvgDeltaKg,
    alcoholAveragedMoreGain: alcoholGroupAvgDeltaKg > noAlcoholGroupAvgDeltaKg,
    strength: classifyCorrelationStrength(
      alcoholGroupAvgDeltaKg - noAlcoholGroupAvgDeltaKg,
      DAILY_STRENGTH_THRESHOLDS_KG,
    ),
  }
}

/**
 * A plain-arithmetic, non-AI "pattern" summary, same shape as
 * `nightEatingCorrelation`: splits `alcoholPoints` into alcohol and
 * non-alcohol groups and reports which averaged more next-day gain.
 * Requires `MIN_COMPARABLE_DAYS` points with both groups represented.
 * Returns null otherwise.
 */
export function alcoholCorrelation(
  entries: DailyEntry[],
): AlcoholCorrelation | null {
  return alcoholCorrelationFromPoints(alcoholPoints(entries))
}
