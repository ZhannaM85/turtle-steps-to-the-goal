import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { BODY_COMPOSITION_SERIES_KEYS, type BodyCompositionSeriesKey } from '@/domain/stats'
import type { ChartSeriesType } from './customChartSelectionStore'

const DEFAULT_CHART_TYPES: Record<BodyCompositionSeriesKey, ChartSeriesType> = {
  muscleMassKg: 'line',
  visceralFatRating: 'line',
  bodyWaterPercent: 'line',
  boneMassKg: 'line',
  bodyFatPercent: 'line',
}

interface BodyCompositionSelectionState {
  selected: BodyCompositionSeriesKey[]
  /** #696 — per-series line/bar/dots, same shape as `useMacroChartSelectionStore`. */
  chartTypes: Record<BodyCompositionSeriesKey, ChartSeriesType>
  setSelected: (keys: BodyCompositionSeriesKey[]) => void
  setChartType: (key: BodyCompositionSeriesKey, type: ChartSeriesType) => void
}

/**
 * Persists which of the 5 body-composition fields (#267) are plotted on
 * `BodyCompositionTrendChart` (#277) and how each series is drawn (#696) —
 * defaults to all 5 as lines, matching the chart's original always-show-
 * everything line behavior. Same local-preference category/persistence
 * shape as `useCustomChartSelectionStore` / `useMacroChartSelectionStore`,
 * kept as a separate store since this covers a fixed 5-key set rather than
 * the general "Compare your data" chart's arbitrary series selection.
 */
export const useBodyCompositionSelectionStore =
  create<BodyCompositionSelectionState>()(
    persist(
      (set) => ({
        selected: [...BODY_COMPOSITION_SERIES_KEYS],
        chartTypes: DEFAULT_CHART_TYPES,
        setSelected: (selected) => set({ selected }),
        setChartType: (key, type) =>
          set((state) => ({
            chartTypes: { ...state.chartTypes, [key]: type },
          })),
      }),
      {
        name: 'turtle-steps-body-composition-selection',
        storage: createJSONStorage(() => localStorage),
      },
    ),
  )
