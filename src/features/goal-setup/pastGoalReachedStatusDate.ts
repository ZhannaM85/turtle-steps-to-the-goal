import { goalWeekEnd, type Goal, type GoalWindowProgress } from '@/domain/goal'

type ReachedProgress = Pick<
  GoalWindowProgress,
  'finalTargetMet' | 'metOnDate' | 'currentWeightDate' | 'weekEnd'
>

/**
 * #1079 — a reached past-goal row names the weigh-in day the target was
 * met (`metOnDate`), not the planned `weekEnd`. A later weigh-in is only
 * a fallback when that day was not recorded. Not-reached weeks return
 * null so callers keep their missed / no-data copy (#639).
 */
export function pastGoalReachedStatusDate(
  progress: ReachedProgress | null,
): string | null {
  if (progress?.finalTargetMet !== true) return null
  return progress.metOnDate ?? progress.currentWeightDate ?? null
}

/**
 * #1079 — when the goal was reached before the planned week end, the
 * history range ends on that weigh-in day. Otherwise the stored end
 * (or `weekStart + 6`).
 */
export function pastGoalHistoryWeekEnd(
  goal: Pick<Goal, 'weekStart' | 'weekEnd'>,
  progress: ReachedProgress | null,
): string {
  const planned =
    goal.weekEnd ?? (goal.weekStart ? goalWeekEnd(goal.weekStart) : '')
  const reached = pastGoalReachedStatusDate(progress)
  if (reached && planned && reached < planned) return reached
  return planned
}

/**
 * #1079 — weigh-in day to close this goal on, and to start the next one
 * on, when the target was met before the planned week end. Null on a
 * last-day reach (`#671` still bumps that restart to the next day).
 */
export function earlyReachedOnDate(
  progress: ReachedProgress | null | undefined,
): string | null {
  const reached = pastGoalReachedStatusDate(progress ?? null)
  if (!reached || !progress?.weekEnd) return null
  if (reached >= progress.weekEnd) return null
  return reached
}
