import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/**
 * The eating-cutoff time `fastingCutoffComparison` (#257) tests — a local
 * UI preference, same category as weekStart/unit (not part of the export
 * bundle). "HH:MM" 24-hour, defaulting to 18:00 (the specific popular
 * claim being tested, "stop eating by 6pm"), but user-adjustable so any
 * personal cutoff theory can be tested, not just that one.
 */
interface FastingCutoffStoreState {
  cutoffTime: string
  setCutoffTime: (cutoffTime: string) => void
}

export const useFastingCutoffStore = create<FastingCutoffStoreState>()(
  persist(
    (set) => ({
      cutoffTime: '18:00',
      setCutoffTime: (cutoffTime) => set({ cutoffTime }),
    }),
    {
      name: 'turtle-steps-fasting-cutoff',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
