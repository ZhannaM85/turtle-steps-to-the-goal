import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/**
 * Entry field comparison indicators (#664) — on by default, same shape as
 * nutritionFactsStore (#663). Gates the live arrow while editing daily
 * fields and the post-save ⓘ tooltip (vs prior day + vs exactly 30 days
 * ago). Local-only UI preference, not exported with backups.
 */
interface EntryComparisonStoreState {
  enabled: boolean
  setEnabled: (enabled: boolean) => void
}

export const useEntryComparisonStore = create<EntryComparisonStoreState>()(
  persist(
    (set) => ({
      enabled: true,
      setEnabled: (enabled) => set({ enabled }),
    }),
    {
      name: 'turtle-steps-entry-comparison',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
