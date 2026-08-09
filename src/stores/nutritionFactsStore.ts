import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/**
 * Nutrition-facts encouragement (#663) — on by default (flipped after
 * on-device validation; storage key bumped so devices that already
 * persisted the earlier off default pick up on). Same shape as
 * alcoholTrackingStore/digestionTrackingStore. Gates both the Day
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
      enabled: true,
      setEnabled: (enabled) => set({ enabled }),
    }),
    {
      // v2: default flipped on after on-device validation of #663.
      name: 'turtle-steps-nutrition-facts-v2',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
