import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type Unit = 'kg' | 'lb'

interface UnitStoreState {
  unit: Unit
  setUnit: (unit: Unit) => void
}

export const useUnitStore = create<UnitStoreState>()(
  persist(
    (set) => ({
      unit: 'kg',
      setUnit: (unit) => set({ unit }),
    }),
    {
      name: 'turtle-steps-unit',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
