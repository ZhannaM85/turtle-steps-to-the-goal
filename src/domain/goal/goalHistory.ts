import type { DailyEntry } from '@/domain/dailyEntry'
import type { Goal } from './Goal'
import { goalWindowProgress, type GoalWindowProgress } from './goalWindowProgress'

export interface PastGoalRecord {
  goal: Goal
  /** Same `goalWindowProgress()` (#135) the active goal's own live progress
   * uses, computed against this goal's own (now-closed) window — null
   * only if the goal predates #135 and has no `weekStart`. */
  progress: GoalWindowProgress | null
  /** Display-only approximate end date (#181) for a goal with no
   * `weekStart` (one saved before #135 shipped, so it never had a real
   * window computed for it) — the date whatever goal superseded it was
   * created, an objectively knowable fact even without a stored window.
   * Undefined when `goal.weekStart` is set (the real `weekEnd` already
   * covers this) or — impossible in practice, since every entry in this
   * list was by definition superseded by something — there's no
   * superseding goal to derive it from. */
  approximateEndDate?: string
}

/**
 * The earliest `createdAt` across every `Goal` record ever saved (#426) —
 * distinct from the currently *active* goal's own `createdAt`, which resets
 * to "now" every time the user starts a fresh weekly target (`saveGoal`,
 * #147/#181) and so is almost always very recent. Used as a stable,
 * one-time cutoff for "did goal-tracking exist yet during this week" — a
 * week from before the user ever set up any goal at all shouldn't show a
 * target-met/not-met verdict, but a week that predates only the *current*
 * goal (while an earlier one was already active) should still be evaluated.
 */
export function earliestGoalCreatedAt(goals: Goal[]): string | undefined {
  if (goals.length === 0) return undefined
  return goals.reduce(
    (earliest, goal) => (goal.createdAt < earliest ? goal.createdAt : earliest),
    goals[0].createdAt,
  )
}

/**
 * Every goal except the currently active one (#147) — the most-recently-
 * created, which `GoalRepository.getActiveGoal()` already surfaces via
 * `GoalScreen`'s main StatCard, so repeating it here would be redundant.
 * Newest-first. Each save creates its own historical `Goal` record unless
 * it was an in-place edit of the still-live active goal (#181 —
 * `formValuesToGoal` only starts a fresh record once the previous one's
 * window has actually ended), so this is a plain read over
 * `GoalRepository.getAll()` — no separate history log to maintain.
 */
export function pastGoals(goals: Goal[], entries: DailyEntry[]): PastGoalRecord[] {
  if (goals.length <= 1) return []

  const newestFirst = [...goals].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  )
  return newestFirst.slice(1).map((goal, i) => ({
    goal,
    progress: goalWindowProgress(entries, goal),
    // newestFirst[i] is the goal one slot newer than this one — i.e. the
    // goal that superseded it (see loop math: this element is
    // newestFirst[i + 1]).
    approximateEndDate: goal.weekStart
      ? undefined
      : newestFirst[i].createdAt.slice(0, 10),
  }))
}
