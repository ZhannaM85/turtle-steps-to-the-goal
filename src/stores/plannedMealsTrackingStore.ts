import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/**
 * Opt-in Planned Meals section (#626) — off by default. Reported live
 * right after #614 shipped: without food search/macros, the feature's
 * value wasn't obvious, so it moved behind a toggle like the other
 * optional Day-screen sections (cycle/digestion/water/alcohol tracking).
 * Same shape as those — the on/off switch is in the JSON backup settings
 * blob (#861); logged `PlannedMeal` rows still travel with the day's data.
 */
interface PlannedMealsTrackingStoreState {
  enabled: boolean
  setEnabled: (enabled: boolean) => void
}

export const usePlannedMealsTrackingStore =
  create<PlannedMealsTrackingStoreState>()(
    persist(
      (set) => ({
        enabled: false,
        setEnabled: (enabled) => set({ enabled }),
      }),
      {
        name: 'turtle-steps-planned-meals-tracking',
        storage: createJSONStorage(() => localStorage),
      },
    ),
  )
