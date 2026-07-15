import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/**
 * Opt-in menstrual cycle tracking (#61) — off by default, no gender field.
 * A local-only UI preference, same as unit/theme: not part of the export
 * bundle (see exportBundleSchema.ts — only DailyEntry.onPeriod itself,
 * the logged data, travels with a backup; this on/off switch doesn't).
 */
interface CycleTrackingStoreState {
  enabled: boolean
  setEnabled: (enabled: boolean) => void
}

export const useCycleTrackingStore = create<CycleTrackingStoreState>()(
  persist(
    (set) => ({
      enabled: false,
      setEnabled: (enabled) => set({ enabled }),
    }),
    {
      name: 'turtle-steps-cycle-tracking',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
