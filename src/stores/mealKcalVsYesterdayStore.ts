import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/**
 * #836 — Day meal-card vs-yesterday kcal arrows. On by default to match
 * entry field comparisons (#664): same up/down family, local-only UI
 * preference, not exported with backups.
 */
interface MealKcalVsYesterdayStoreState {
  enabled: boolean
  setEnabled: (enabled: boolean) => void
}

export const useMealKcalVsYesterdayStore =
  create<MealKcalVsYesterdayStoreState>()(
    persist(
      (set) => ({
        enabled: true,
        setEnabled: (enabled) => set({ enabled }),
      }),
      {
        name: 'turtle-steps-meal-kcal-vs-yesterday',
        storage: createJSONStorage(() => localStorage),
      },
    ),
  )
