import { goalWindowHasEnded } from '@/domain/goal'
import { useGoalCelebrationStore } from '@/stores'
import { useActiveGoalProgress } from './useActiveGoalProgress'

/** Which celebration moment is currently relevant for the active goal's
 * window (#639) — 'inProgress' while the window is still running (the
 * target was crossed, but not final yet), 'complete' once the window has
 * actually ended with its final state still meeting the target. */
export type GoalCelebrationPhase = 'inProgress' | 'complete'

/**
 * Whether to show the weekly-goal celebration modal (#55), and which
 * phase's copy to show (#639). Two independent one-time moments per
 * window, each with its own dismissal tracking (`useGoalCelebrationStore`)
 * so dismissing one doesn't suppress the other:
 *
 * - 'inProgress': fires as soon as the window's running progress
 *   (`targetMet`, sticky — see `goalWindowProgress.ts`) crosses true,
 *   mid-window. Deliberately doesn't flip-flop back off if a later day's
 *   weight regresses — this is a "you're on track" moment, not a final
 *   verdict, so nothing to walk back once shown.
 * - 'complete': fires once the window has actually ended
 *   (`goalWindowHasEnded`) *and* its real final state (`finalTargetMet`)
 *   still met the target — the moment a new goal can actually be started.
 *   A window that crossed the target mid-week but regressed by the end
 *   never reaches this phase at all, matching the permanent history badge
 *   (`PastTargetsList.tsx`), which uses the same `finalTargetMet`.
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
  const celebratedCompleteWeekStart = useGoalCelebrationStore(
    (state) => state.celebratedCompleteWeekStart,
  )
  const markCelebrated = useGoalCelebrationStore(
    (state) => state.markCelebrated,
  )

  if (progress === null) {
    return {
      shouldCelebrate: false,
      phase: 'inProgress',
      weekEnd: null,
      dismiss: () => {},
    }
  }

  if (goalWindowHasEnded(progress.weekEnd)) {
    const shouldCelebrate =
      progress.finalTargetMet === true &&
      progress.weekStart !== celebratedCompleteWeekStart
    return {
      shouldCelebrate,
      phase: 'complete',
      weekEnd: progress.weekEnd,
      dismiss: () => markCelebrated(progress.weekStart, 'complete'),
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
