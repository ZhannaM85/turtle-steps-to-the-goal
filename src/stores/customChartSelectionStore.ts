import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { NumericSeriesKey } from '@/domain/stats'

/** Per-series chart type (#137) for `CustomChartView`'s "Compare data"
 * chart — line is the default look, bar/dots are alternates. */
export type ChartSeriesType = 'line' | 'bar' | 'dots'

const DEFAULT_CHART_TYPES: Record<NumericSeriesKey, ChartSeriesType> = {
  weight: 'line',
  calories: 'line',
  protein: 'line',
  fat: 'line',
  carbs: 'line',
  water: 'line',
  steps: 'line',
  waist: 'line',
  hip: 'line',
  bodyFat: 'line',
  fastingHours: 'line',
}

const DEFAULT_SELECTED_NUMERIC: NumericSeriesKey[] = ['weight', 'calories']

interface CustomChartSelectionState {
  selectedNumeric: NumericSeriesKey[]
  selectedBoolean: string[]
  /** #371 — custom metrics (#336) selectable alongside the built-in
   * series above. Always plotted as a plain line on the shared normalized
   * axis (no per-metric bar/dots toggle, no dual-real-axis participation)
   * — a deliberate v1 scope trim, same category as #336's own documented
   * trims, since an unbounded user-defined list doesn't fit the fixed-key
   * assumptions the dual-axis/chart-type-toggle code was built around. */
  selectedCustomMetricIds: string[]
  chartTypes: Record<NumericSeriesKey, ChartSeriesType>
  setSelectedNumeric: (keys: NumericSeriesKey[]) => void
  setSelectedBoolean: (keys: string[]) => void
  setSelectedCustomMetricIds: (ids: string[]) => void
  setChartType: (key: NumericSeriesKey, type: ChartSeriesType) => void
}

/**
 * Persists `CustomChartView`'s toggled series and each series' line/bar/dots
 * display mode across navigation (#195) — previously plain `useState`, so
 * revisiting Dashboard silently reset back to the weight+calories/all-lines
 * default every time, discarding whatever comparison the user had set up.
 * Same local-preference category and persistence shape as `weekStartStore`/
 * `useUnitStore` — not part of the export bundle.
 */
export const useCustomChartSelectionStore = create<CustomChartSelectionState>()(
  persist(
    (set) => ({
      selectedNumeric: DEFAULT_SELECTED_NUMERIC,
      selectedBoolean: [],
      selectedCustomMetricIds: [],
      chartTypes: DEFAULT_CHART_TYPES,
      setSelectedNumeric: (selectedNumeric) => set({ selectedNumeric }),
      setSelectedBoolean: (selectedBoolean) => set({ selectedBoolean }),
      setSelectedCustomMetricIds: (selectedCustomMetricIds) =>
        set({ selectedCustomMetricIds }),
      setChartType: (key, type) =>
        set((state) => ({
          chartTypes: { ...state.chartTypes, [key]: type },
        })),
    }),
    {
      name: 'turtle-steps-custom-chart-selection',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
