import { addDays, format, parseISO, subDays } from 'date-fns'
import type { DailyEntry } from '@/domain/dailyEntry'
import type { Goal } from './Goal'

const DATE_FORMAT = 'yyyy-MM-dd'

/** Require at least this many distinct days logged within the current
 * window before targetMet can be assessed (#177) — a single day's
 * weigh-in (e.g. the day a goal is set, weekStart itself) compared
 * against the prior week's average is ordinary day-to-day fluctuation,
 * not a real week of progress; reporting "target met" from that one
 * data point read as physically impossible ("no time has passed").
 * Same "don't draw a conclusion from too little data" reasoning as
 * stats/*Correlation.ts's own MIN_COMPARABLE_DAYS gates. */
const MIN_WINDOW_DAYS_LOGGED = 2

/** The last day of the 7-day window `weekStart` anchors (#135) — a fixed
 * 7-day span from whenever the target was last saved, not a calendar
 * grid. */
export function goalWeekEnd(weekStart: string): string {
  return format(addDays(parseISO(weekStart), 6), DATE_FORMAT)
}

export interface GoalWindowProgress {
  weekStart: string
  weekEnd: string
  /** Average logged weight within [weekStart, weekEnd] — null if nothing's
   * been logged yet this window. */
  averageWeightKg: number | null
  /** Average logged weight over the 7 days immediately before weekStart —
   * the baseline this window's progress is measured against. Null if
   * there's no data back that far (e.g. a goal set shortly after the user
   * started logging). */
  priorAverageWeightKg: number | null
  /** averageWeightKg - priorAverageWeightKg, null unless both exist. */
  deltaKg: number | null
  /** Whether the window's running average has crossed goal.targetWeeklyLossKg
   * at any point so far (mirrors metOnDate — true iff metOnDate is set) —
   * null without at least MIN_WINDOW_DAYS_LOGGED days logged this window. */
  targetMet: boolean | null
  /** The first date (within [weekStart, weekEnd]) the window's *running*
   * average — recomputed day by day as entries accumulate, not just the
   * final snapshot — first crossed goal.targetWeeklyLossKg (#177). Null if
   * it never crossed, or there isn't yet enough data to tell. Stays set
   * once found even if a later day's average dips back below target —
   * matches useWeeklyGoalCelebration's existing "once met, stays met for
   * this window" reasoning. */
  metOnDate: string | null
}

function average(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

/**
 * Progress within a goal's own anchored window (#135), the direct
 * replacement for reading `weeklySummaries()`'s last calendar-week entry —
 * that function stays calendar-grid-based for Dashboard/History's
 * retrospective week-by-week views, a separate concern from "is the
 * currently active target being met." Returns null when the goal has no
 * `weekStart` yet (an old goal never re-saved since #135).
 */
export function goalWindowProgress(
  entries: DailyEntry[],
  goal: Goal,
): GoalWindowProgress | null {
  const weekStart = goal.weekStart
  if (!weekStart) return null

  const weekEnd = goalWeekEnd(weekStart)
  const priorStart = format(subDays(parseISO(weekStart), 7), DATE_FORMAT)
  const priorEnd = format(subDays(parseISO(weekStart), 1), DATE_FORMAT)

  const currentWeights = entries
    .filter((entry) => entry.date >= weekStart && entry.date <= weekEnd)
    .map((entry) => entry.weightKg)
    .filter((value): value is number => value !== undefined)
  const priorWeights = entries
    .filter((entry) => entry.date >= priorStart && entry.date <= priorEnd)
    .map((entry) => entry.weightKg)
    .filter((value): value is number => value !== undefined)

  const averageWeightKg = average(currentWeights)
  const priorAverageWeightKg = average(priorWeights)
  const deltaKg =
    averageWeightKg !== null && priorAverageWeightKg !== null
      ? averageWeightKg - priorAverageWeightKg
      : null

  // Recompute the average day by day as entries accumulate (#177), rather
  // than only checking the final snapshot — finds *when* the target was
  // first crossed, and doubles as the MIN_WINDOW_DAYS_LOGGED gate for
  // targetMet below.
  const windowEntriesSorted = entries
    .filter(
      (entry) =>
        entry.date >= weekStart &&
        entry.date <= weekEnd &&
        entry.weightKg !== undefined,
    )
    .sort((a, b) => a.date.localeCompare(b.date))

  let metOnDate: string | null = null
  if (priorAverageWeightKg !== null) {
    const runningWeights: number[] = []
    for (const entry of windowEntriesSorted) {
      runningWeights.push(entry.weightKg as number)
      if (runningWeights.length < MIN_WINDOW_DAYS_LOGGED) continue
      const runningAverage = average(runningWeights) as number
      if (-(runningAverage - priorAverageWeightKg) >= goal.targetWeeklyLossKg) {
        metOnDate = entry.date
        break
      }
    }
  }

  const targetMet =
    currentWeights.length >= MIN_WINDOW_DAYS_LOGGED &&
    priorAverageWeightKg !== null
      ? metOnDate !== null
      : null

  return {
    weekStart,
    weekEnd,
    averageWeightKg,
    priorAverageWeightKg,
    deltaKg,
    targetMet,
    metOnDate,
  }
}
