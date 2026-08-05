import { format, type Day } from 'date-fns'
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

export interface CorrelationInsightPoint {
  /** #224 — stable per-point key for tap-to-exclude outlier handling
   * (`shared/hooks/useOutlierExclusion.ts`) — this metric is weekly, not
   * daily, so the key is a week-start date, not a day. */
  weekStart: string
  calories: number
  delta: number
}

/**
 * The comparable weeks behind `correlationInsight` below, exposed
 * separately (#224) so a view can filter out manually-excluded outlier
 * points before computing the summary — same "raw points vs. gated
 * insight" split every other correlation module already uses.
 *
 * #522 — drops incomplete weeks: a week whose calendar end is still after
 * `asOfDate` (defaults to today), or whose start falls before the earliest
 * entry in the set (period filter truncating the first week). Those
 * partial averages (e.g. current week with only Mon–Tue logged) read as a
 * single-day calorie total in the tooltip and send people to "fix" a day
 * that isn't wrong. Sparse historical weeks that already finished are kept
 * — average-over-logged-days is intentional there.
 */
/** Shared by `correlationInsightPoints` and `weeklyCorrelationExcludesCurrentWeek`
 * below — one place computing `effectiveAsOf`/the comparable-weeks list, so
 * the two stay in sync instead of each re-deriving it. */
function comparableWeeksContext(
  entries: DailyEntry[],
  weekStartsOn: Day,
  asOfDate: string | undefined,
) {
  let minDate = entries[0].date
  let maxDate = entries[0].date
  for (const entry of entries) {
    if (entry.date < minDate) minDate = entry.date
    if (entry.date > maxDate) maxDate = entry.date
  }
  // Period filters ending mid-week (and the live "today" window) both need
  // the same gate: don't treat a week as finished until its Sunday/end is
  // on or before both the clock and the last day we actually have data for.
  const clockAsOf = asOfDate ?? format(new Date(), 'yyyy-MM-dd')
  const effectiveAsOf = clockAsOf < maxDate ? clockAsOf : maxDate
  const weeks = weeklySummaries(entries, undefined, weekStartsOn)
  return { minDate, maxDate, effectiveAsOf, weeks }
}

export function correlationInsightPoints(
  entries: DailyEntry[],
  weekStartsOn: Day = 1,
  asOfDate?: string,
): CorrelationInsightPoint[] {
  if (entries.length === 0) return []

  const { minDate, effectiveAsOf, weeks } = comparableWeeksContext(
    entries,
    weekStartsOn,
    asOfDate,
  )
  return weeks
    .filter(
      (w) =>
        w.averageCalories !== null &&
        w.deltaVsPriorWeekKg !== null &&
        w.weekStart >= minDate &&
        w.weekEnd <= effectiveAsOf,
    )
    .map((w) => ({
      weekStart: w.weekStart,
      calories: w.averageCalories as number,
      delta: w.deltaVsPriorWeekKg as number,
    }))
}

/**
 * Whether `correlationInsightPoints` above dropped a real, still-in-progress
 * current week (#613) — distinct from the period-start truncation case
 * (`weekStart >= minDate`, a chosen date range cutting off the first week),
 * which isn't "current" and isn't surprising the same way. Lets the view
 * tell users their most recent week is intentionally left out because it
 * isn't finished yet, rather than looking like a silent gap.
 */
export function weeklyCorrelationExcludesCurrentWeek(
  entries: DailyEntry[],
  weekStartsOn: Day = 1,
  asOfDate?: string,
): boolean {
  if (entries.length === 0) return false
  const { maxDate, effectiveAsOf, weeks } = comparableWeeksContext(
    entries,
    weekStartsOn,
    asOfDate,
  )
  return weeks.some(
    (w) =>
      w.averageCalories !== null &&
      w.deltaVsPriorWeekKg !== null &&
      w.weekStart <= maxDate &&
      w.weekEnd > effectiveAsOf,
  )
}

/**
 * The median-split math on its own, taking already-computed points rather
 * than entries — #224 lets a view filter out manually-excluded outlier
 * points first and pass the remainder straight in. `correlationInsight`
 * below is a thin wrapper over this + `correlationInsightPoints`.
 *
 * This compares each week's *average* calories to that *same week's*
 * change, not same-day figures — weight lags calorie intake by more than
 * a day (digestion/water/glycogen), so a day-level comparison would be
 * measuring the wrong thing. Week-level averaging is the reasonable
 * proxy; callers should still word any copy with that lag in mind.
 */
export function correlationInsightFromPoints(
  points: CorrelationInsightPoint[],
): CorrelationInsight | null {
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

/**
 * A plain-arithmetic, non-AI "pattern" summary: splits comparable weeks
 * (weeks with both an average-calorie figure and a delta vs. the prior
 * week) into a lower-calorie and a higher-calorie half by median, and
 * reports which half averaged more loss. Requires at least
 * MIN_COMPARABLE_WEEKS so each half has a couple of weeks behind it,
 * rather than a single-week coin flip. Returns null otherwise.
 */
export function correlationInsight(
  entries: DailyEntry[],
  weekStartsOn: Day = 1,
  asOfDate?: string,
): CorrelationInsight | null {
  return correlationInsightFromPoints(
    correlationInsightPoints(entries, weekStartsOn, asOfDate),
  )
}
