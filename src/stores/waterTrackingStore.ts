import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/**
 * Opt-in water/hydration tracking (#258) — off by default, same shape as
 * cycleTrackingStore/digestionTrackingStore: a local-only UI preference,
 * not part of the export bundle (only DailyEntry.waterMl itself, the
 * logged data, travels with a backup — this on/off switch doesn't).
 */
interface WaterTrackingStoreState {
  enabled: boolean
  setEnabled: (enabled: boolean) => void
}

export const useWaterTrackingStore = create<WaterTrackingStoreState>()(
  persist(
    (set) => ({
      enabled: false,
      setEnabled: (enabled) => set({ enabled }),
    }),
    {
      name: 'turtle-steps-water-tracking',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
