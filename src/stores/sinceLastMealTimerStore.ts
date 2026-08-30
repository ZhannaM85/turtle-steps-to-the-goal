import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/**
 * #791 — opt-in elapsed time since last meal on the Day screen
 * (intermittent fasting). Off by default. Same shape as
 * `useCopyYesterdayMealsStore`: a local-only UI preference, not part of
 * the export bundle.
 */
interface SinceLastMealTimerStoreState {
  enabled: boolean
  setEnabled: (enabled: boolean) => void
}

export const useSinceLastMealTimerStore =
  create<SinceLastMealTimerStoreState>()(
    persist(
      (set) => ({
        enabled: false,
        setEnabled: (enabled) => set({ enabled }),
      }),
      {
        name: 'turtle-steps-since-last-meal-timer',
        storage: createJSONStorage(() => localStorage),
      },
    ),
  )
