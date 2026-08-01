import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/**
 * Which History calendar marker dots to paint (#482) — independent of
 * Settings' "what to track" toggles: cycle/digestion tracking can stay on
 * for logging while the calendar stays quieter. Defaults match today's
 * behavior (all on). Period/digestion dots are still also gated by their
 * tracking stores at render time.
 */
export type CalendarMarkerKey =
  | 'entry'
  | 'period'
  | 'digestion'
  | 'nightEating'

const DEFAULT_VISIBLE: Record<CalendarMarkerKey, boolean> = {
  entry: true,
  period: true,
  digestion: true,
  nightEating: true,
}

interface CalendarMarkerVisibilityState {
  visible: Record<CalendarMarkerKey, boolean>
  toggleVisible: (marker: CalendarMarkerKey) => void
}

export const useCalendarMarkerVisibilityStore =
  create<CalendarMarkerVisibilityState>()(
    persist(
      (set) => ({
        visible: DEFAULT_VISIBLE,
        toggleVisible: (marker) =>
          set((state) => ({
            visible: {
              ...state.visible,
              [marker]: !state.visible[marker],
            },
          })),
      }),
      {
        name: 'turtle-steps-calendar-marker-visibility',
        storage: createJSONStorage(() => localStorage),
      },
    ),
  )
