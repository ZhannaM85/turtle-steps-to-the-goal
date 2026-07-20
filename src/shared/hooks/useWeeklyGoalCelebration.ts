import { useGoalCelebrationStore } from '@/stores'
import { useActiveGoalProgress } from './useActiveGoalProgress'

/**
 * Whether to show the weekly-goal-met celebration modal (#55) — fires as
 * soon as the current goal-anchored window's (#135, `goalWindowProgress`)
 * running progress crosses true, mid-window, not just once the window is
 * over. Independent of #38's separate end-of-window banner; both can fire
 * for the same window.
 *
 * targetMet is a running number, not stable until the window ends, so once
 * a window has been celebrated it stays celebrated even if the average
 * later dips back below target — avoids flip-flopping the modal back on
 * for the same window.
 */
export function useWeeklyGoalCelebration(): {
  shouldCelebrate: boolean
  dismiss: () => void
} {
  const progress = useActiveGoalProgress()
  const celebratedWeekStart = useGoalCelebrationStore(
    (state) => state.celebratedWeekStart,
  )
  const markCelebrated = useGoalCelebrationStore(
    (state) => state.markCelebrated,
  )

  const shouldCelebrate =
    progress !== null &&
    progress.targetMet === true &&
    progress.weekStart !== celebratedWeekStart

  return {
    shouldCelebrate,
    dismiss: () => {
      if (progress) markCelebrated(progress.weekStart)
    },
  }
}
