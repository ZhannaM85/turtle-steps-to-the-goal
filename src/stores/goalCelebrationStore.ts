import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/**
 * Tracks only the most recently celebrated window's start date (#55) — a
 * new goal-anchored window (#135, `Goal.weekStart`) always has a different
 * weekStart once renewed, so comparing against just this one value is
 * enough to know "has *this* window already been celebrated," without
 * needing a growing history of every window ever celebrated.
 *
 * #639: the mid-week "crossed the target, keep going" moment and the
 * end-of-window "completed!" moment are two genuinely different messages
 * for the same window — dismissing one shouldn't suppress the other, so
 * each phase gets its own tracked weekStart.
 */
interface GoalCelebrationStoreState {
  celebratedInProgressWeekStart: string | null
  celebratedCompleteWeekStart: string | null
  markCelebrated: (
    weekStart: string,
    phase: 'inProgress' | 'complete',
  ) => void
}

export const useGoalCelebrationStore = create<GoalCelebrationStoreState>()(
  persist(
    (set) => ({
      celebratedInProgressWeekStart: null,
      celebratedCompleteWeekStart: null,
      markCelebrated: (weekStart, phase) =>
        set(
          phase === 'inProgress'
            ? { celebratedInProgressWeekStart: weekStart }
            : { celebratedCompleteWeekStart: weekStart },
        ),
    }),
    {
      name: 'turtle-steps-goal-celebration',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
