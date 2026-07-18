import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/**
 * Tracks only the most recently celebrated window's start date (#55) — a
 * new goal-anchored window (#135, `Goal.weekStart`) always has a different
 * weekStart once renewed, so comparing against just this one value is
 * enough to know "has *this* window already been celebrated," without
 * needing a growing history of every window ever celebrated.
 */
interface GoalCelebrationStoreState {
  celebratedWeekStart: string | null
  markCelebrated: (weekStart: string) => void
}

export const useGoalCelebrationStore = create<GoalCelebrationStoreState>()(
  persist(
    (set) => ({
      celebratedWeekStart: null,
      markCelebrated: (weekStart) => set({ celebratedWeekStart: weekStart }),
    }),
    {
      name: 'turtle-steps-goal-celebration',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
