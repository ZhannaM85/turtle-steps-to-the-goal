import { format } from 'date-fns'
import type { DailyEntry } from '@/domain/dailyEntry'
import type { Goal } from './Goal'
import {
  goalWindowConcluded,
  goalWindowProgress,
  type GoalWindowProgress,
} from './goalWindowProgress'

const DATE_FORMAT = 'yyyy-MM-dd'

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
 * Past Targets (#147, #678) — newest-first, each paired with its own
 * `goalWindowProgress()`. Each save creates its own historical `Goal`
 * record unless it was an in-place edit of the still-live active goal
 * (#181), so this is a plain read over `GoalRepository.getAll()`.
 *
 * The most-recently-created ("active") goal is excluded while its window
 * is still live — it's already shown by `GoalScreen`'s main StatCard, so
 * repeating it would be redundant. Once the window has concluded
 * (`goalWindowConcluded`, #667), it appears here too even before a new
 * goal replaces it (#678), so a finished week isn't invisible until the
 * user gets around to starting the next one. While live it still only
 * lives in the main card.
 */
export function pastGoals(
  goals: Goal[],
  entries: DailyEntry[],
  today: string = format(new Date(), DATE_FORMAT),
): PastGoalRecord[] {
  if (goals.length === 0) return []

  const newestFirst = [...goals].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  )
  const active = newestFirst[0]
  const activeProgress = goalWindowProgress(entries, active)
  const includeActive =
    activeProgress != null && goalWindowConcluded(activeProgress, today)
  const startIndex = includeActive ? 0 : 1
  if (startIndex >= newestFirst.length) return []

  return newestFirst.slice(startIndex).map((goal, i) => {
    const newestFirstIndex = startIndex + i
    return {
      goal,
      progress: goalWindowProgress(entries, goal),
      // The goal one slot newer in newestFirst superseded this one. The
      // included active goal (index 0) has no superseder.
      approximateEndDate: goal.weekStart
        ? undefined
        : newestFirstIndex > 0
          ? newestFirst[newestFirstIndex - 1].createdAt.slice(0, 10)
          : undefined,
    }
  })
}
