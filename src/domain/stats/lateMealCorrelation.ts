import { addDays, format, parseISO } from 'date-fns'
import { effectiveTimeEaten } from '@/shared/lib/mealLabel'
import type { DailyEntry } from '@/domain/dailyEntry'
import {
  classifyCorrelationStrength,
  DAILY_STRENGTH_THRESHOLDS_KG,
  type CorrelationStrength,
} from './correlationStrength'
import { adjustForDayStart } from './dayStart'

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

/** The latest meal time (recorded or #580 slot default) across a day's
 * meals, in minutes since midnight — null if the day has no meals with a
 * usable time. Deliberately *not* day-start-adjusted here — `.minutes` also
 * doubles as `LateMealCorrelationView.tsx`'s raw scatter-chart X position,
 * which should keep showing a meal's true wall-clock time; the day-start
 * adjustment instead happens only where "earlier vs. later" is actually
 * decided, in `lateMealCorrelationFromPoints` below (#601). */
function lastMealTimeMinutes(entry: DailyEntry): number | null {
  const times = (entry.calorieEntries ?? [])
    .map((meal) => effectiveTimeEaten(meal))
    .filter((time): time is string => time !== undefined)
  return times.length === 0 ? null : Math.max(...times.map(timeToMinutes))
}

export interface LateMealPoint {
  /** The day the last-meal time (x-axis) was logged — #523: open-day /
   * outlier chips navigate here so the meal times match the plotted
   * value. Weight delta is still next-morning's change; previously this
   * was the weight day, which sent people to a day whose last meal did
   * not match the x-axis (#523 live report). Distinct from
   * `FastingWindowPoint.date`, which stays the day the fast *ends*. */
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
      date: entry.date,
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
 *
 * #601 — sorts/splits on `adjustForDayStart(point.minutes, ...)`, not the
 * raw `.minutes` a point stores (which stays untouched for charting — see
 * `lastMealTimeMinutes`'s own comment): otherwise a genuine 1am meal (a
 * small raw-minutes value) sorted as the *earliest* meal of the day instead
 * of what it actually was, the latest. `dayStartTime` defaults to midnight
 * (today's existing behavior for any caller that doesn't pass one).
 * `thresholdMinutes` can come out above 1440 when the split lands inside
 * the adjusted (pre-day-start) range — `minutesToTimeLabel`'s own `% 24`
 * already renders that back to the correct wall-clock hour.
 */
export function lateMealCorrelationFromPoints(
  points: LateMealPoint[],
  dayStartTime = '00:00',
): LateMealCorrelation | null {
  if (points.length < MIN_COMPARABLE_DAYS) return null

  const dayStartMinutes = timeToMinutes(dayStartTime)
  const adjustedMinutes = (point: LateMealPoint) =>
    adjustForDayStart(point.minutes, dayStartMinutes)

  const sorted = [...points].sort(
    (a, b) => adjustedMinutes(a) - adjustedMinutes(b),
  )
  const mid = Math.ceil(sorted.length / 2)
  const earlierGroup = sorted.slice(0, mid)
  const laterGroup = sorted.slice(mid)
  if (laterGroup.length === 0) return null

  const earlierGroupAvgDeltaKg = average(earlierGroup.map((p) => p.deltaKg))
  const laterGroupAvgDeltaKg = average(laterGroup.map((p) => p.deltaKg))
  const rawThresholdMinutes =
    (adjustedMinutes(earlierGroup[earlierGroup.length - 1]) +
      adjustedMinutes(laterGroup[0])) /
    2

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
  dayStartTime = '00:00',
): LateMealCorrelation | null {
  return lateMealCorrelationFromPoints(lateMealPoints(entries), dayStartTime)
}
