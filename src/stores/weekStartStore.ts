import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/**
 * Which weekday "Week 1"/every subsequent week starts on (#85) — a local
 * UI preference, same category as unit/theme (not part of the export
 * bundle). 'monday' is the original ISO-week behavior; 'firstEntryWeekday'
 * anchors to whatever weekday the user's earliest logged entry falls on,
 * for people who started tracking mid-week and found "Week 2" two days
 * after their first entry confusing.
 */
export type WeekStart = 'monday' | 'firstEntryWeekday'

interface WeekStartStoreState {
  weekStart: WeekStart
  setWeekStart: (weekStart: WeekStart) => void
}

export const useWeekStartStore = create<WeekStartStoreState>()(
  persist(
    (set) => ({
      weekStart: 'monday',
      setWeekStart: (weekStart) => set({ weekStart }),
    }),
    {
      name: 'turtle-steps-week-start',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
