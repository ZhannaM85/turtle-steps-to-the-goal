import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/**
 * #1126 — week, month, and year average weight under the Day weight.
 * Off by default.
 */
interface AverageWeightStoreState {
  enabled: boolean
  setEnabled: (enabled: boolean) => void
}

export const useAverageWeightStore = create<AverageWeightStoreState>()(
  persist(
    (set) => ({
      enabled: false,
      setEnabled: (enabled) => set({ enabled }),
    }),
    {
      name: 'turtle-steps-average-weight',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
