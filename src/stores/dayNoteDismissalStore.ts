import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/** Day notes that share the morning-note skip (#1080). */
export type DayNoteDismissalField =
  | 'note'
  | 'morningNote'
  | 'nightEatingReason'
  | 'nightEatingNoWhatHelped'

interface DayNoteDismissalState {
  /**
   * `${date}:${field}` the user closed with × while nothing was saved.
   * An empty note and a skipped one are both missing text, so the day
   * form (remounted per date) would reopen the editor without this.
   */
  dismissed: Record<string, true>
  dismiss: (key: string) => void
  /** Delete reopens an empty editor; drop a previous skip. */
  restore: (key: string) => void
}

export function dayNoteDismissalKey(
  date: string,
  field: DayNoteDismissalField,
): string {
  return `${date}:${field}`
}

export const useDayNoteDismissalStore = create<DayNoteDismissalState>()(
  persist(
    (set) => ({
      dismissed: {},
      dismiss: (key) =>
        set((state) => ({
          dismissed: { ...state.dismissed, [key]: true },
        })),
      restore: (key) =>
        set((state) => {
          if (!state.dismissed[key]) return state
          const dismissed = { ...state.dismissed }
          delete dismissed[key]
          return { dismissed }
        }),
    }),
    {
      name: 'turtle-steps-day-note-dismissal',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
