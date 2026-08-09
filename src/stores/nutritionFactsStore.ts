import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/**
 * Opt-in nutrition-facts encouragement (#663) — off by default, same shape
 * as alcoholTrackingStore/digestionTrackingStore. Gates both the Day
 * screen's nutrition-facts card and the meal-composition screen's inline
 * praise; a local-only UI preference, not exported with backups.
 */
interface NutritionFactsStoreState {
  enabled: boolean
  setEnabled: (enabled: boolean) => void
}

export const useNutritionFactsStore = create<NutritionFactsStoreState>()(
  persist(
    (set) => ({
      enabled: false,
      setEnabled: (enabled) => set({ enabled }),
    }),
    {
      name: 'turtle-steps-nutrition-facts',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
