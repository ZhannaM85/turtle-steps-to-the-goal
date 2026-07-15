import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/**
 * Tracks only the most recently celebrated ISO week's start date (#55) — a
 * new week always has a different weekStart, so comparing against just this
 * one value is enough to know "has *this* week already been celebrated,"
 * without needing a growing history of every week ever celebrated.
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
