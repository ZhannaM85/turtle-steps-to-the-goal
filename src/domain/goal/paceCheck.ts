import type { PastGoalRecord } from './goalHistory'

/** How many consecutive, most-recent completed windows must all have missed
 * before the pace-check card shows (#610) — the low end of the issue's own
 * "3-4" range: enough to read as a real pattern, not a single bad week. */
export const PACE_CHECK_MIN_CONSECUTIVE_MISSES = 3

export interface PaceCheckInsight {
  windowCount: number
  /** Average of `baselineWeightKg - currentWeightKg` across the recent
   * missed windows — same "loss is positive" sign convention
   * `goalWindowProgress.ts` already uses, so a negative value here means
   * net weight *gain* across those weeks, not just "loss below target". */
  averageWeeklyDeltaKg: number
  targetWeeklyLossKg: number
}

/**
 * A calm, weekly-framed pace check (#610) — explicitly not a long-term
 * projection or finish-date estimate (#228 rejected that as conflicting
 * with this app's small-steps framing). Looks only at the most recent
 * `PACE_CHECK_MIN_CONSECUTIVE_MISSES` completed windows (`pastGoals()`,
 * already newest-first): if every one of them has a real, assessed
 * `finalTargetMet: false` (no gaps — an unassessed or hit window anywhere
 * in that span breaks the "consistent miss" pattern and returns null),
 * reports the average actual weekly change to compare against
 * `targetWeeklyLossKg`. #639: uses `finalTargetMet` (the window's actual
 * final state), not the sticky `targetMet` — a window whose target was
 * only ever crossed on one noisy day, then regressed, is a real miss for
 * pattern-detection purposes even though `targetMet` itself stays true.
 */
export function paceCheckInsight(
  recentPastRecords: PastGoalRecord[],
  targetWeeklyLossKg: number,
): PaceCheckInsight | null {
  const recent = recentPastRecords.slice(0, PACE_CHECK_MIN_CONSECUTIVE_MISSES)
  if (recent.length < PACE_CHECK_MIN_CONSECUTIVE_MISSES) return null

  const deltas: number[] = []
  for (const record of recent) {
    const progress = record.progress
    if (!progress || progress.finalTargetMet !== false) return null
    if (
      progress.baselineWeightKg === undefined ||
      progress.currentWeightKg === undefined
    ) {
      return null
    }
    deltas.push(progress.baselineWeightKg - progress.currentWeightKg)
  }

  return {
    windowCount: recent.length,
    averageWeeklyDeltaKg: deltas.reduce((sum, d) => sum + d, 0) / deltas.length,
    targetWeeklyLossKg,
  }
}
