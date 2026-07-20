import { addDays, format, parseISO } from 'date-fns'
import type { DailyEntry } from '@/domain/dailyEntry'
import type { Goal } from './Goal'

const DATE_FORMAT = 'yyyy-MM-dd'

/** The last day of the 7-day window `weekStart` anchors (#135) — a fixed
 * 7-day span from whenever the target was last saved, not a calendar
 * grid. */
export function goalWeekEnd(weekStart: string): string {
  return format(addDays(parseISO(weekStart), 6), DATE_FORMAT)
}

export interface GoalWindowProgress {
  weekStart: string
  weekEnd: string
  /** Whether some day within [weekStart, weekEnd] has logged a weight at
   * least `goal.targetWeeklyLossKg` below whatever was logged on
   * `weekStart` itself (#203 — day-over-day, not an average). Null until
   * `weekStart` itself has a logged weight to compare against; there's no
   * substitute/fallback baseline (e.g. the prior week's average, #203's
   * predecessor design), so an early save on a day after `weekStart` but
   * before `weekStart` itself is logged can't be assessed yet. */
  targetMet: boolean | null
  /** The first date (within [weekStart, weekEnd]) whose logged weight was
   * at least `goal.targetWeeklyLossKg` below `weekStart`'s own logged
   * weight. Null if it never happened, or there isn't yet a baseline to
   * compare against. `weekStart` itself is included in the days checked —
   * its own delta against itself is always 0, so it can never satisfy a
   * positive target, ruling out the "reached on day zero" case without a
   * separate guard for it. Stays set once found even if a later day's
   * weight rises back above the threshold — a goal reached once stays
   * reached for its window, matching useWeeklyGoalCelebration's existing
   * "once met, stays met" reasoning. */
  metOnDate: string | null
}

/**
 * Progress within a goal's own anchored window (#135), the direct
 * replacement for reading `weeklySummaries()`'s last calendar-week entry —
 * that function stays calendar-grid-based for Dashboard/History's
 * retrospective week-by-week views, a separate concern from "is the
 * currently active target being met." Returns null when the goal has no
 * `weekStart` yet (an old goal never re-saved since #135).
 *
 * #203: replaced the original average-vs-prior-week-average model — day
 * over day instead, comparing each day directly against whatever was
 * logged on `weekStart` itself, no averaging on either side. A weight that
 * goes *up* day over day can no longer read as "target met" the way an
 * average briefly dipping below target from noisy data once could.
 */
export function goalWindowProgress(
  entries: DailyEntry[],
  goal: Goal,
): GoalWindowProgress | null {
  const weekStart = goal.weekStart
  if (!weekStart) return null

  const weekEnd = goalWeekEnd(weekStart)

  const baselineWeightKg = entries.find(
    (entry) => entry.date === weekStart,
  )?.weightKg

  if (baselineWeightKg === undefined) {
    return { weekStart, weekEnd, targetMet: null, metOnDate: null }
  }

  const windowEntriesSorted = entries
    .filter(
      (entry) =>
        entry.date >= weekStart &&
        entry.date <= weekEnd &&
        entry.weightKg !== undefined,
    )
    .sort((a, b) => a.date.localeCompare(b.date))

  let metOnDate: string | null = null
  for (const entry of windowEntriesSorted) {
    const lossKg = baselineWeightKg - (entry.weightKg as number)
    if (lossKg >= goal.targetWeeklyLossKg) {
      metOnDate = entry.date
      break
    }
  }

  return {
    weekStart,
    weekEnd,
    targetMet: metOnDate !== null,
    metOnDate,
  }
}
