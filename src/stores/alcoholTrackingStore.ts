import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/**
 * Opt-in alcohol day signal (#607) — off by default. Same shape as
 * cycleTrackingStore/digestionTrackingStore. The on/off switch is in the
 * JSON backup settings blob (#861); logged `DailyEntry.hadAlcohol` still
 * travels with the day's data either way.
 */
interface AlcoholTrackingStoreState {
  enabled: boolean
  setEnabled: (enabled: boolean) => void
}

export const useAlcoholTrackingStore = create<AlcoholTrackingStoreState>()(
  persist(
    (set) => ({
      enabled: false,
      setEnabled: (enabled) => set({ enabled }),
    }),
    {
      name: 'turtle-steps-alcohol-tracking',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
