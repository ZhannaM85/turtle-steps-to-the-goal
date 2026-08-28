import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/**
 * #764 — opt-in "Why am I eating?" on Add meal. Off by default. Local UI
 * preference only (not in the export bundle); logged `eatingReason` values
 * still travel with JSON backups like any other meal field.
 */
interface EatingReasonTrackingStoreState {
  enabled: boolean
  setEnabled: (enabled: boolean) => void
}

export const useEatingReasonTrackingStore =
  create<EatingReasonTrackingStoreState>()(
    persist(
      (set) => ({
        enabled: false,
        setEnabled: (enabled) => set({ enabled }),
      }),
      {
        name: 'turtle-steps-eating-reason-tracking',
        storage: createJSONStorage(() => localStorage),
      },
    ),
  )
