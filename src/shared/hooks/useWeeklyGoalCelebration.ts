import { goalWindowConcluded } from '@/domain/goal'
import { useDailyEntryStore, useGoalCelebrationStore } from '@/stores'
import { useActiveGoalProgress } from './useActiveGoalProgress'

/** Which celebration moment is currently relevant for the active goal's
 * window (#639) — 'inProgress' while the window is still running (the
 * target was crossed, but not final yet), 'complete' once the window has
 * actually ended with its final state still meeting the target. */
export type GoalCelebrationPhase = 'inProgress' | 'complete'

/**
 * Whether to show the weekly-goal celebration modal (#55), and which
 * phase's copy to show (#639).
 *
 * - 'inProgress': fires as soon as the window's running progress
 *   (`targetMet`, sticky — see `goalWindowProgress.ts`) crosses true,
 *   mid-window. Dismissing this one is still persisted
 *   (`celebratedInProgressWeekStart`) so it doesn't nag again the same
 *   week. Deliberately doesn't flip-flop back off if a later day's
 *   weight regresses.
 * - 'complete': fires once the window has concluded (`goalWindowConcluded`
 *   — calendar past weekEnd, or last-day weigh-in that still meets the
 *   target, #667 / #776) **and** a weight save happened this session
 *   (#783). Opening Day / remounting the app is not enough — that was
 *   the #778 remount-always-offer bug. Dismiss stays closed until the
 *   next weight save (edit+save, or delete and log again) or a new goal.
 *   A persisted `celebratedCompleteWeekStart` from older builds is ignored.
 *
 * Independent of #38's separate end-of-window renewal banner.
 */
export function useWeeklyGoalCelebration(): {
  shouldCelebrate: boolean
  phase: GoalCelebrationPhase
  /** The active goal window's own end date — the 'inProgress' phase's
   * copy names it ("keep it up through X"). Null whenever shouldCelebrate
   * is false, since there's nothing to render either way. */
  weekEnd: string | null
  dismiss: () => void
} {
  const progress = useActiveGoalProgress()
  const celebratedInProgressWeekStart = useGoalCelebrationStore(
    (state) => state.celebratedInProgressWeekStart,
  )
  const markCelebrated = useGoalCelebrationStore(
    (state) => state.markCelebrated,
  )
  const weightSaveGeneration = useDailyEntryStore(
    (state) => state.weightSaveGeneration,
  )
  const completeOfferDismissedGeneration = useDailyEntryStore(
    (state) => state.completeOfferDismissedGeneration,
  )
  const dismissCompleteOffer = useDailyEntryStore(
    (state) => state.dismissCompleteOffer,
  )

  const completeEligible =
    progress != null &&
    goalWindowConcluded(progress) &&
    progress.finalTargetMet === true

  const shouldCelebrateComplete =
    completeEligible &&
    weightSaveGeneration > 0 &&
    completeOfferDismissedGeneration !== weightSaveGeneration

  if (progress === null) {
    return {
      shouldCelebrate: false,
      phase: 'inProgress',
      weekEnd: null,
      dismiss: () => {},
    }
  }

  if (goalWindowConcluded(progress)) {
    return {
      shouldCelebrate: shouldCelebrateComplete,
      phase: 'complete',
      weekEnd: progress.weekEnd,
      dismiss: dismissCompleteOffer,
    }
  }

  const shouldCelebrate =
    progress.targetMet === true &&
    progress.weekStart !== celebratedInProgressWeekStart
  return {
    shouldCelebrate,
    phase: 'inProgress',
    weekEnd: progress.weekEnd,
    dismiss: () => markCelebrated(progress.weekStart, 'inProgress'),
  }
}
