import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/**
 * Opt-in digestion tracking — off by default. A local-only UI preference,
 * same as cycleTrackingStore: not part of the export bundle (see
 * exportBundleSchema.ts — only DailyEntry.hadConstipation itself, the
 * logged data, travels with a backup; this on/off switch doesn't). Tracks
 * constipation (the problem), not a normal bowel movement, so the toggle
 * is only ever needed on an exception day.
 */
interface DigestionTrackingStoreState {
  enabled: boolean
  setEnabled: (enabled: boolean) => void
}

export const useDigestionTrackingStore = create<DigestionTrackingStoreState>()(
  persist(
    (set) => ({
      enabled: false,
      setEnabled: (enabled) => set({ enabled }),
    }),
    {
      name: 'turtle-steps-digestion-tracking',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
