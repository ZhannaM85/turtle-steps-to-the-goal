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
   * least `goal.targetWeeklyLossKg` below `baselineWeightKg` below (#203 —
   * day-over-day, not an average). Null until a baseline exists at all —
   * for a goal saved since #676, that's the frozen snapshot from the
   * moment it was created, so this is assessable from `weekStart` day one;
   * for an older goal that predates that field, it's still whatever was
   * logged on `weekStart` itself (no substitute/fallback baseline there,
   * e.g. the prior week's average, #203's predecessor design — an early
   * save on a day after `weekStart` but before `weekStart` itself is
   * logged can't be assessed yet for that case). */
  targetMet: boolean | null
  /** The first date (within [weekStart, weekEnd]) whose logged weight was
   * at least `goal.targetWeeklyLossKg` below `baselineWeightKg`. Null if it
   * never happened, or there isn't yet a baseline to compare against.
   * `weekStart` itself is included in the days checked — pre-#676, its own
   * delta against itself (then always the baseline) was always 0, ruling
   * out a "reached on day zero" result without a separate guard; #676's
   * frozen baseline can differ from `weekStart`'s own logged weight, so
   * that's no longer guaranteed — a goal can now genuinely read as met
   * from its very first day, which is correct given the baseline reflects
   * whatever was already true before the goal was even set. Stays set once
   * found even if a later day's weight rises back above the threshold — a
   * goal reached once stays reached for its window, matching
   * useWeeklyGoalCelebration's existing "once met, stays met" reasoning. */
  metOnDate: string | null
  /** #339 — the baseline every day in the window is compared against.
   * #676 HARD LOCK: creation-time `goal.baselineWeightKg` when present;
   * otherwise weekStart weigh-in / prior-day fallback. Never let a later
   * weekStart weigh-in override an existing snapshot. */
  baselineWeightKg?: number
  /** #339 — the most recently logged weight within the window (undefined
   * if there's no logged weight at all beyond the baseline), so a
   * past-goal row can show *which* weigh-ins a status came from instead of
   * just the label. #639: previously froze at the weight on `metOnDate`
   * once the target was first met, even if a later day's weight regressed
   * — always the true latest weigh-in now, which `finalTargetMet` below
   * depends on being accurate. */
  currentWeightKg?: number
  /** #639 — whether the window's actual *final* state (its most recently
   * logged weight, i.e. `currentWeightKg`, vs. `baselineWeightKg`) met the
   * target — as opposed to the sticky `targetMet` above, which stays true
   * once crossed even if a later day's weight rises back above the
   * threshold. This is the value a *permanent* record (the past-targets
   * badge, the pace check) should use; `targetMet`/`metOnDate` remain
   * correct for the one-time mid-week celebration, which deliberately
   * doesn't flip-flop back off once shown. Only meaningful once the window
   * has actually ended (`goalWindowHasEnded`) — same null condition as
   * `targetMet` (no baseline weight logged yet). */
  finalTargetMet?: boolean | null
}

/**
 * Resolve the weight every day in the window is compared against (#676/#681).
 *
 * ##########################################################################
 * # #676 HARD LOCK — DO NOT INVERT / DELETE (reopened on-device repeatedly) #
 * ##########################################################################
 * Once `goal.baselineWeightKg` is set at goal-creation/save time, it is the
 * immutable «from» / progress baseline. A weigh-in logged *later* on
 * `weekStart` must NEVER replace it (Day+Goal cards showed «от 58,65» then
 * flipped to «от 58,9» after logging start-day weight — that regression is
 * exactly what this order prevents).
 *
 * #681's real fix is at *save* time (`GoalForm` snapshots the weekStart
 * weigh-in when it already exists). Do **not** "fix" #681 here by
 * preferring live weekStart over the snapshot — that reopens #676.
 *
 * Fallback order when the snapshot is missing (legacy goals): weekStart's
 * own logged weight, then latest prior-day weight.
 */
export function resolveBaselineWeightKg(
  goal: Goal,
  entries: DailyEntry[],
): number | undefined {
  // #676 — snapshot first. Agents: leave this above any weekStartEntry look-up.
  if (goal.baselineWeightKg !== undefined) {
    return goal.baselineWeightKg
  }

  const weekStart = goal.weekStart
  if (!weekStart) return undefined

  const weekStartEntry = entries.find(
    (entry) => entry.date === weekStart && entry.weightKg !== undefined,
  )
  if (weekStartEntry?.weightKg !== undefined) {
    return weekStartEntry.weightKg
  }

  return latestWeightBefore(entries, weekStart)
}

function latestWeightBefore(
  entries: DailyEntry[],
  beforeDate: string,
): number | undefined {
  const prior = entries
    .filter(
      (entry) =>
        entry.date < beforeDate && entry.weightKg !== undefined,
    )
    .sort((a, b) => a.date.localeCompare(b.date))
  return prior.at(-1)?.weightKg
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

  const weekEnd = goal.weekEnd ?? goalWeekEnd(weekStart)

  // #681 — baseline is the weigh-in on weekStart when one exists; otherwise
  // the creation-time snapshot (#676) or a prior-day fallback. See
  // `resolveBaselineWeightKg`.
  const baselineWeightKg = resolveBaselineWeightKg(goal, entries)

  if (baselineWeightKg === undefined) {
    return {
      weekStart,
      weekEnd,
      targetMet: null,
      metOnDate: null,
      finalTargetMet: null,
    }
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

  const lastWindowEntry = windowEntriesSorted.at(-1)
  const currentWeightKg = lastWindowEntry?.weightKg
  const finalTargetMet =
    currentWeightKg === undefined
      ? null
      : baselineWeightKg - currentWeightKg >= goal.targetWeeklyLossKg

  return {
    weekStart,
    weekEnd,
    targetMet: metOnDate !== null,
    metOnDate,
    baselineWeightKg,
    currentWeightKg,
    finalTargetMet,
  }
}

/**
 * Whether `weekEnd` (an ISO date, inclusive) has fully passed as of `today`
 * (defaults to the real current date) — the natural end of a
 * goal-anchored window (#639), used to gate the restart button and decide
 * when a window's *final* state (`finalTargetMet`) rather than its
 * running one (`targetMet`) should drive the UI.
 */
export function goalWindowHasEnded(
  weekEnd: string,
  today: string = format(new Date(), DATE_FORMAT),
): boolean {
  return today > weekEnd
}

/**
 * Whether a goal's window should be treated as concluded for UI purposes
 * (#667) — either the calendar has actually passed `weekEnd`
 * (`goalWindowHasEnded`), or the target was reached on `weekEnd` itself.
 * The latter is not covered by `goalWindowHasEnded` (still false on that
 * exact day), but nothing logged later in the window can change the
 * outcome once its own last day already has a qualifying entry, so
 * there's no reason to defer the same-day celebration/new-goal unlock to
 * the next calendar day the way an ordinary calendar-end wait would.
 */
export function goalWindowConcluded(
  progress: Pick<GoalWindowProgress, 'weekEnd' | 'finalTargetMet'>,
  today: string = format(new Date(), DATE_FORMAT),
): boolean {
  return (
    goalWindowHasEnded(progress.weekEnd, today) ||
    (today === progress.weekEnd && progress.finalTargetMet === true)
  )
}

/**
 * #552 — the Goal whose `[weekStart, weekEnd]` window contains `date`,
 * if any. When several overlap (rare), the most recently created wins.
 * Goals without `weekStart` (pre-#135) never match.
 */
export function goalCoveringDate(goals: Goal[], date: string): Goal | undefined {
  const covering = goals.filter((goal) => {
    if (!goal.weekStart) return false
    return date >= goal.weekStart && date <= (goal.weekEnd ?? goalWeekEnd(goal.weekStart))
  })
  if (covering.length === 0) return undefined
  return covering.reduce((newest, goal) =>
    goal.createdAt > newest.createdAt ? goal : newest,
  )
}
