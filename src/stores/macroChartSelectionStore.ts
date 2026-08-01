import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { NumericSeriesKey } from '@/domain/stats'
import type { ChartSeriesType } from './customChartSelectionStore'

/** #501 — the four series `MacroTrendChart` can plot. Reuses
 * `customChartSeries.ts`' own key names rather than inventing a parallel
 * union, so the chart can feed them straight into `customChartPoints()`
 * for raw + normalized values. Calories joins the original three macros
 * here: the chart is "macros + calories," not macros-only. */
export type MacroSeriesKey = Extract<
  NumericSeriesKey,
  'protein' | 'fat' | 'carbs' | 'calories'
>

export const MACRO_SERIES_KEYS: MacroSeriesKey[] = [
  'protein',
  'fat',
  'carbs',
  'calories',
]

const DEFAULT_CHART_TYPES: Record<MacroSeriesKey, ChartSeriesType> = {
  protein: 'line',
  fat: 'line',
  carbs: 'line',
  calories: 'line',
}

interface MacroChartSelectionState {
  selected: MacroSeriesKey[]
  chartTypes: Record<MacroSeriesKey, ChartSeriesType>
  setSelected: (keys: MacroSeriesKey[]) => void
  setChartType: (key: MacroSeriesKey, type: ChartSeriesType) => void
}

/**
 * Persists which series `MacroTrendChart` (#501) plots and how each one is
 * drawn. Same local-preference category and persistence shape as
 * `useBodyCompositionSelectionStore`/`useCustomChartSelectionStore`, kept
 * as its own store rather than folded into either: the body-composition
 * one covers a different fixed key set, and sharing "Compare your data"'s
 * store would tie the two charts' pickers together, so changing a series
 * on one would silently change the other.
 */
export const useMacroChartSelectionStore = create<MacroChartSelectionState>()(
  persist(
    (set) => ({
      selected: [...MACRO_SERIES_KEYS],
      chartTypes: DEFAULT_CHART_TYPES,
      setSelected: (selected) => set({ selected }),
      setChartType: (key, type) =>
        set((state) => ({
          chartTypes: { ...state.chartTypes, [key]: type },
        })),
    }),
    {
      name: 'turtle-steps-macro-chart-selection',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
