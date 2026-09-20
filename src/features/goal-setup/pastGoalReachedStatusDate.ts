import type { GoalWindowProgress } from '@/domain/goal'

/**
 * #972 — a reached past-goal row names the window's `weekEnd`, not
 * `metOnDate` (the first mid-week day the target was met). Not-reached
 * weeks return null so callers leave their existing missed/no-data copy.
 */
export function pastGoalReachedStatusDate(
  progress: Pick<GoalWindowProgress, 'finalTargetMet' | 'weekEnd'> | null,
): string | null {
  if (progress?.finalTargetMet !== true) return null
  return progress.weekEnd
}
