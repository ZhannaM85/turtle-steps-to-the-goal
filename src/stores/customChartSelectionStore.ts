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
  /** #391 — widened from `Record<NumericSeriesKey, ChartSeriesType>` so a
   * custom metric's id can carry its own chart-type entry too (#371's v1
   * trim only ever meant "no dual/single real-axis participation," not "no
   * line/bar/dots choice" — that part extends cleanly since chart type is
   * purely a rendering choice, independent of axis assignment). A metric id
   * with no entry yet defaults to `'line'` at the read site, same as every
   * `NumericSeriesKey` already does via `DEFAULT_CHART_TYPES` below. */
  chartTypes: Record<string, ChartSeriesType>
  setSelectedNumeric: (keys: NumericSeriesKey[]) => void
  setSelectedBoolean: (keys: string[]) => void
  setSelectedCustomMetricIds: (ids: string[]) => void
  setChartType: (key: string, type: ChartSeriesType) => void
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
