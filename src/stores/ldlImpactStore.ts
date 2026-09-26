import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/**
 * #1012 — opt-in Day LDL labels. Off by default, same shape as
 * digestion/alcohol tracking. Turning this off only hides
 * `CholesterolImpactIndicator`; stored `cholesterolImpact` /
 * `cholesterolReason` stay on the food. The switch is in the JSON
 * backup settings blob (`ldlImpact`, #861).
 */
interface LdlImpactStoreState {
  enabled: boolean
  setEnabled: (enabled: boolean) => void
}

export const useLdlImpactStore = create<LdlImpactStoreState>()(
  persist(
    (set) => ({
      enabled: false,
      setEnabled: (enabled) => set({ enabled }),
    }),
    {
      name: 'turtle-steps-ldl-impact',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
