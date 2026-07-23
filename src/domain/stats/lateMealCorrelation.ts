import { addDays, format, parseISO } from 'date-fns'
import type { DailyEntry } from '@/domain/dailyEntry'
import {
  classifyCorrelationStrength,
  DAILY_STRENGTH_THRESHOLDS_KG,
  type CorrelationStrength,
} from './correlationStrength'

export interface LateMealCorrelation {
  dayCount: number
  /** Last-meal-time threshold, in minutes since midnight, splitting the
   * "earlier" and "later" groups. */
  thresholdMinutes: number
  earlierGroupAvgDeltaKg: number
  laterGroupAvgDeltaKg: number
  laterAveragedMoreGain: boolean
  /** #224 — plain-arithmetic strength label, see correlationStrength.ts. */
  strength: CorrelationStrength
}

const MIN_COMPARABLE_DAYS = 8

function average(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

function timeToMinutes(hhmm: string): number {
  const [hours, minutes] = hhmm.split(':').map(Number)
  return hours * 60 + minutes
}

/** The latest `timeEaten` logged across a day's meals, in minutes since
 * midnight — null if the day has no meals with a time recorded. */
function lastMealTimeMinutes(entry: DailyEntry): number | null {
  const times = (entry.calorieEntries ?? [])
    .map((meal) => meal.timeEaten)
    .filter((time): time is string => time !== undefined)
  return times.length === 0 ? null : Math.max(...times.map(timeToMinutes))
}

export interface LateMealPoint {
  /** The day this point's delta belongs to (the *next* calendar day after
   * the late-meal reading) — #224's stable per-point key for tap-to-exclude
   * outlier handling, same "date the point ends on" convention
   * `FastingWindowPoint.date` already uses. */
  date: string
  minutes: number
  deltaKg: number
}

/**
 * Each day's *latest meal time* (minutes since midnight) paired with the
 * *next calendar day's* day-over-day weight change — the raw points behind
 * `lateMealCorrelation` below, exported separately so a scatter chart can
 * render every available point even before there's enough for a threshold
 * split (same "raw points vs. gated insight" split `CorrelationView`/
 * `correlationInsight` use, just kept together here instead of duplicated
 * in the view). A day only contributes a point if it has a logged weight,
 * at least one meal with a recorded time, and the very next calendar date
 * also has a logged weight — the delta needs both endpoints, same
 * reasoning as `TodayScreen`'s vs-yesterday stat (#42).
 */
export function lateMealPoints(entries: DailyEntry[]): LateMealPoint[] {
  const byDate = new Map(entries.map((entry) => [entry.date, entry]))
  const points: LateMealPoint[] = []

  for (const entry of entries) {
    if (entry.weightKg === undefined) continue
    const minutes = lastMealTimeMinutes(entry)
    if (minutes === null) continue
    const nextDate = format(addDays(parseISO(entry.date), 1), 'yyyy-MM-dd')
    const nextEntry = byDate.get(nextDate)
    if (!nextEntry || nextEntry.weightKg === undefined) continue
    points.push({
      date: nextEntry.date,
      minutes,
      deltaKg: nextEntry.weightKg - entry.weightKg,
    })
  }

  return points
}

/**
 * The median-split math on its own, taking already-computed points rather
 * than entries — #224 lets a view filter out manually-excluded outlier
 * points first (`shared/hooks/useOutlierExclusion.ts`) and pass the
 * remainder straight in, without this function knowing exclusion exists at
 * all. `lateMealCorrelation` below is a thin wrapper over this + `lateMealPoints`.
 */
export function lateMealCorrelationFromPoints(
  points: LateMealPoint[],
): LateMealCorrelation | null {
  if (points.length < MIN_COMPARABLE_DAYS) return null

  const sorted = [...points].sort((a, b) => a.minutes - b.minutes)
  const mid = Math.ceil(sorted.length / 2)
  const earlierGroup = sorted.slice(0, mid)
  const laterGroup = sorted.slice(mid)
  if (laterGroup.length === 0) return null

  const earlierGroupAvgDeltaKg = average(earlierGroup.map((p) => p.deltaKg))
  const laterGroupAvgDeltaKg = average(laterGroup.map((p) => p.deltaKg))
  const rawThresholdMinutes =
    (earlierGroup[earlierGroup.length - 1].minutes + laterGroup[0].minutes) / 2

  return {
    dayCount: points.length,
    thresholdMinutes: Math.round(rawThresholdMinutes / 15) * 15,
    earlierGroupAvgDeltaKg,
    laterGroupAvgDeltaKg,
    laterAveragedMoreGain: laterGroupAvgDeltaKg > earlierGroupAvgDeltaKg,
    strength: classifyCorrelationStrength(
      laterGroupAvgDeltaKg - earlierGroupAvgDeltaKg,
      DAILY_STRENGTH_THRESHOLDS_KG,
    ),
  }
}

/**
 * A plain-arithmetic, non-AI "pattern" summary distinct from
 * `correlationInsight` (which compares a *week's* average calories to that
 * week's weight change): splits `lateMealPoints`' comparable day-pairs into
 * an earlier-eating and later-eating half by median, and reports which half
 * averaged more next-day gain. Requires MIN_COMPARABLE_DAYS pairs —
 * day-level pairs are noisier than `correlationInsight`'s week-level
 * averages, so this needs more of them before a split is meaningful.
 * Returns null otherwise.
 */
export function lateMealCorrelation(
  entries: DailyEntry[],
): LateMealCorrelation | null {
  return lateMealCorrelationFromPoints(lateMealPoints(entries))
}
