import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

interface SettingsPinState {
  pinned: string[]
  toggle: (id: string) => void
}

/** #820 — Settings cards pinned below About. About is never in this list. */
export const useSettingsPinStore = create<SettingsPinState>()(
  persist(
    (set) => ({
      pinned: [],
      toggle: (id) =>
        set((state) => ({
          pinned: state.pinned.includes(id)
            ? state.pinned.filter((item) => item !== id)
            : [...state.pinned, id],
        })),
    }),
    {
      name: 'turtle-steps-settings-pins',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)

export function settingsPinOrder(pinned: string[], id: string): number {
  const index = pinned.indexOf(id)
  return index === -1 ? 0 : -1000 + index
}
