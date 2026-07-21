import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/** #245 — whole-chart show/hide, distinct from #238's within-a-chart
 * raw/average series toggle. Started with the three trend charts only;
 * #247 extended the same mechanism to the custom chart section and each
 * correlation card (one toggle per card, not one for the whole group —
 * matches #245's own per-chart granularity). Broader Today/Goal-page
 * section dismissal stays #232's separate, still-unscoped territory. */
export type DashboardChartKey =
  | 'weight'
  | 'calories'
  | 'macros'
  | 'customChart'
  | 'calorieWeightCorrelation'
  | 'lateMealCorrelation'
  | 'sleepCorrelation'
  | 'stepsCorrelation'
  | 'proteinCorrelation'

const DEFAULT_VISIBLE: Record<DashboardChartKey, boolean> = {
  weight: true,
  calories: true,
  macros: true,
  customChart: true,
  calorieWeightCorrelation: true,
  lateMealCorrelation: true,
  sleepCorrelation: true,
  stepsCorrelation: true,
  proteinCorrelation: true,
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
