import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { BODY_COMPOSITION_SERIES_KEYS, type BodyCompositionSeriesKey } from '@/domain/stats'

interface BodyCompositionSelectionState {
  selected: BodyCompositionSeriesKey[]
  setSelected: (keys: BodyCompositionSeriesKey[]) => void
}

/**
 * Persists which of the 5 body-composition fields (#267) are plotted on
 * `BodyCompositionTrendChart` (#277) — defaults to all 5, matching the
 * chart's original always-show-everything behavior. Same local-preference
 * category/persistence shape as `useCustomChartSelectionStore`, a separate
 * store since this covers a fixed 5-key set rather than the general
 * "Compare your data" chart's arbitrary series selection.
 */
export const useBodyCompositionSelectionStore =
  create<BodyCompositionSelectionState>()(
    persist(
      (set) => ({
        selected: [...BODY_COMPOSITION_SERIES_KEYS],
        setSelected: (selected) => set({ selected }),
      }),
      {
        name: 'turtle-steps-body-composition-selection',
        storage: createJSONStorage(() => localStorage),
      },
    ),
  )
