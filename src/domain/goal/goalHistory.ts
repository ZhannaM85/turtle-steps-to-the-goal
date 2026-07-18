import type { DailyEntry } from '@/domain/dailyEntry'
import type { Goal } from './Goal'
import { goalWindowProgress, type GoalWindowProgress } from './goalWindowProgress'

export interface PastGoalRecord {
  goal: Goal
  /** Same `goalWindowProgress()` (#135) the active goal's own live progress
   * uses, computed against this goal's own (now-closed) window — null
   * only if the goal predates #135 and has no `weekStart`. */
  progress: GoalWindowProgress | null
}

/**
 * Every goal except the currently active one (#147) — the most-recently-
 * created, which `GoalRepository.getActiveGoal()` already surfaces via
 * `GoalScreen`'s main StatCard, so repeating it here would be redundant.
 * Newest-first. Each save creates its own historical `Goal` record
 * (`formValuesToGoal` no longer reuses a previous id/createdAt), so this is
 * a plain read over `GoalRepository.getAll()` — no separate history log to
 * maintain.
 */
export function pastGoals(goals: Goal[], entries: DailyEntry[]): PastGoalRecord[] {
  if (goals.length <= 1) return []

  const newestFirst = [...goals].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  )
  return newestFirst.slice(1).map((goal) => ({
    goal,
    progress: goalWindowProgress(entries, goal),
  }))
}
