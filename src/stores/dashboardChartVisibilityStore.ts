import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/** #245 — whole-chart show/hide, distinct from #238's within-a-chart
 * raw/average series toggle. Weight/calorie/macro trend charts only —
 * the other Dashboard sections (correlations, summary cards, etc.) are
 * #232's broader territory, not this issue's scope. */
export type DashboardChartKey = 'weight' | 'calories' | 'macros'

const DEFAULT_VISIBLE: Record<DashboardChartKey, boolean> = {
  weight: true,
  calories: true,
  macros: true,
}

interface DashboardChartVisibilityState {
  visible: Record<DashboardChartKey, boolean>
  toggleVisible: (chart: DashboardChartKey) => void
}

/**
 * Persists whether each trend chart is shown at all on the Dashboard
 * (#245). Deliberately a separate store from `trendChartSeriesStore.ts`
 * (#238, which series show *within* a chart) — different concept, and
 * keeping them separate avoids one store's shape constraining the other's.
 */
export const useDashboardChartVisibilityStore =
  create<DashboardChartVisibilityState>()(
    persist(
      (set) => ({
        visible: DEFAULT_VISIBLE,
        toggleVisible: (chart) =>
          set((state) => ({
            visible: { ...state.visible, [chart]: !state.visible[chart] },
          })),
      }),
      {
        name: 'turtle-steps-dashboard-chart-visibility',
        storage: createJSONStorage(() => localStorage),
      },
    ),
  )
