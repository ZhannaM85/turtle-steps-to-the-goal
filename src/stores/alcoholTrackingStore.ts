import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/**
 * Opt-in alcohol day signal (#607) — off by default. A local-only UI
 * preference, same shape as cycleTrackingStore/digestionTrackingStore: not
 * part of the export bundle (only `DailyEntry.hadAlcohol` itself, the
 * logged data, travels with a backup; this on/off switch doesn't).
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
