import { addDays, format, parseISO } from 'date-fns'
import { hadNightEating, type DailyEntry } from '@/domain/dailyEntry'
import {
  classifyCorrelationStrength,
  DAILY_STRENGTH_THRESHOLDS_KG,
  type CorrelationStrength,
} from './correlationStrength'

export interface NightEatingCorrelation {
  dayCount: number
  nightEatingGroupAvgDeltaKg: number
  noNightEatingGroupAvgDeltaKg: number
  nightEatingAveragedMoreGain: boolean
  strength: CorrelationStrength
}

const MIN_COMPARABLE_DAYS = 8

function average(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

export interface NightEatingPoint {
  /** The day this point's delta belongs to (the *next* calendar day after
   * the night-eating reading) — same "date the point ends on" convention
   * `MealFrequencyPoint.date`/`LateMealPoint.date` already use. */
  date: string
  hadNightEating: boolean
  deltaKg: number
}

/**
 * Each day's `hadNightEating()` value (#383, derived from logged meal times
 * or a manual override) paired with the *next* calendar day's day-over-day
 * weight change — "does eating late at night relate to next-day weight?"
 * Distinct from #116's `LateMealCorrelationView`, which median-splits the
 * *exact* last-meal-time instead of using a fixed yes/no cutoff — a
 * deliberately simpler, more concrete question, kept as its own view
 * despite the overlap (confirmed with the user). A day only contributes a
 * point if it has a logged weight, the very next calendar date also does,
 * and `hadNightEating()` returns a *definite* value — same two-endpoints
 * requirement every other day-pairing correlation in this folder uses, plus
 * (**#394**) a third requirement this one alone needs: skip a day with no
 * override and no timed meal at all, rather than letting it silently fall
 * into the "No" group the way the old `boolean`-only `hadNightEating()`
 * used to. A manual override alone still gives a definite value with zero
 * meals logged, unlike `mealFrequencyPoints`.
 */
export function nightEatingPoints(entries: DailyEntry[]): NightEatingPoint[] {
  const byDate = new Map(entries.map((entry) => [entry.date, entry]))
  const points: NightEatingPoint[] = []

  for (const entry of entries) {
    if (entry.weightKg === undefined) continue
    const nightEating = hadNightEating(entry)
    if (nightEating === undefined) continue
    const nextDate = format(addDays(parseISO(entry.date), 1), 'yyyy-MM-dd')
    const nextEntry = byDate.get(nextDate)
    if (!nextEntry || nextEntry.weightKg === undefined) continue
    points.push({
      date: nextEntry.date,
      hadNightEating: nightEating,
      deltaKg: nextEntry.weightKg - entry.weightKg,
    })
  }

  return points
}

/**
 * The group-average math on its own, taking already-computed points — same
 * "view filters manually-excluded outliers first" split every other
 * `*CorrelationFromPoints` function in this folder uses. A plain two-group
 * comparison (night-eating days vs. not), not a median split — the
 * predictor here is already boolean, so there's no threshold to find.
 */
export function nightEatingCorrelationFromPoints(
  points: NightEatingPoint[],
): NightEatingCorrelation | null {
  if (points.length < MIN_COMPARABLE_DAYS) return null

  const nightEatingGroup = points.filter((p) => p.hadNightEating)
  const noNightEatingGroup = points.filter((p) => !p.hadNightEating)
  if (nightEatingGroup.length === 0 || noNightEatingGroup.length === 0) {
    return null
  }

  const nightEatingGroupAvgDeltaKg = average(
    nightEatingGroup.map((p) => p.deltaKg),
  )
  const noNightEatingGroupAvgDeltaKg = average(
    noNightEatingGroup.map((p) => p.deltaKg),
  )

  return {
    dayCount: points.length,
    nightEatingGroupAvgDeltaKg,
    noNightEatingGroupAvgDeltaKg,
    nightEatingAveragedMoreGain:
      nightEatingGroupAvgDeltaKg > noNightEatingGroupAvgDeltaKg,
    strength: classifyCorrelationStrength(
      nightEatingGroupAvgDeltaKg - noNightEatingGroupAvgDeltaKg,
      DAILY_STRENGTH_THRESHOLDS_KG,
    ),
  }
}

/**
 * A plain-arithmetic, non-AI "pattern" summary, same shape as
 * `mealFrequencyCorrelation`/`lateMealCorrelation`: splits
 * `nightEatingPoints` into night-eating and non-night-eating groups and
 * reports which averaged more next-day gain. Requires MIN_COMPARABLE_DAYS
 * points with both groups represented. Returns null otherwise.
 */
export function nightEatingCorrelation(
  entries: DailyEntry[],
): NightEatingCorrelation | null {
  return nightEatingCorrelationFromPoints(nightEatingPoints(entries))
}
