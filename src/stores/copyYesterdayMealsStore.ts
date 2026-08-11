import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/**
 * #692 — opt-in "Copy yesterday's meals" Day-screen control. Off by
 * default: the full-width button dominated empty days and was rarely
 * used. Same shape as `usePlannedMealsTrackingStore` (#626) — a
 * local-only UI preference, not part of the export bundle.
 */
interface CopyYesterdayMealsStoreState {
  enabled: boolean
  setEnabled: (enabled: boolean) => void
}

export const useCopyYesterdayMealsStore =
  create<CopyYesterdayMealsStoreState>()(
    persist(
      (set) => ({
        enabled: false,
        setEnabled: (enabled) => set({ enabled }),
      }),
      {
        name: 'turtle-steps-copy-yesterday-meals',
        storage: createJSONStorage(() => localStorage),
      },
    ),
  )
