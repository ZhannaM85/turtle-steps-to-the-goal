import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/** Which trend chart, and which of its two series (#238) — WeightTrendChart
 * and CalorieTrendChart each overlay a raw series with a 7-day rolling
 * average; independent per chart, since someone might want the average on
 * one and not the other. */
export type TrendChartKey = 'weight' | 'calories'
export type TrendSeriesKey = 'raw' | 'average'

const DEFAULT_VISIBLE: Record<TrendChartKey, Record<TrendSeriesKey, boolean>> =
  {
    weight: { raw: true, average: true },
    calories: { raw: true, average: true },
  }

interface TrendChartSeriesState {
  visible: Record<TrendChartKey, Record<TrendSeriesKey, boolean>>
  toggleSeries: (chart: TrendChartKey, series: TrendSeriesKey) => void
}

/**
 * Persists whether the raw and/or 7-day-average series show on the Weight
 * and Calorie trend charts (#238) — previously always both, no way to turn
 * either off. Same local-preference category/persistence shape as
 * `useCustomChartSelectionStore`, a separate store since this covers the
 * two fixed built-in trend charts, not the general "Compare your data"
 * chart's arbitrary series selection.
 */
export const useTrendChartSeriesStore = create<TrendChartSeriesState>()(
  persist(
    (set) => ({
      visible: DEFAULT_VISIBLE,
      toggleSeries: (chart, series) =>
        set((state) => ({
          visible: {
            ...state.visible,
            [chart]: {
              ...state.visible[chart],
              [series]: !state.visible[chart][series],
            },
          },
        })),
    }),
    {
      name: 'turtle-steps-trend-chart-series',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
