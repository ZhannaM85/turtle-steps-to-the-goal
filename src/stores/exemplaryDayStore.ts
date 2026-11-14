import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/**
 * #1125 — opt-in link to a past day near the weekly pace. Off by default.
 * The pin and dismissed dates stay when the switch is off.
 */
interface ExemplaryDayStoreState {
  enabled: boolean
  pinnedDate: string | null
  dismissedDates: string[]
  setEnabled: (enabled: boolean) => void
  setPinnedDate: (pinnedDate: string | null) => void
  dismissDate: (date: string) => void
}

export const useExemplaryDayStore = create<ExemplaryDayStoreState>()(
  persist(
    (set) => ({
      enabled: false,
      pinnedDate: null,
      dismissedDates: [],
      setEnabled: (enabled) => set({ enabled }),
      setPinnedDate: (pinnedDate) =>
        set((state) => ({
          pinnedDate,
          dismissedDates:
            pinnedDate === null
              ? state.dismissedDates
              : state.dismissedDates.filter((date) => date !== pinnedDate),
        })),
      dismissDate: (date) =>
        set((state) => ({
          pinnedDate: state.pinnedDate === date ? null : state.pinnedDate,
          dismissedDates: state.dismissedDates.includes(date)
            ? state.dismissedDates
            : [...state.dismissedDates, date],
        })),
    }),
    {
      name: 'turtle-steps-exemplary-day',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
