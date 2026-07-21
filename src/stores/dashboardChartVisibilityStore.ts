import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/** #245 — whole-chart show/hide, distinct from #238's within-a-chart
 * raw/average series toggle. Started with the three trend charts; #247
 * extended it to the custom chart section and each correlation card
 * (one toggle per card, not one for the whole group); #232 extended it
 * again to every remaining Dashboard section, so every Dashboard section
 * now has one — Today/Goal-page sections use a separate
 * `sectionVisibilityStore.ts` (different pages, different key set). */
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
  | 'foodReactions'
  | 'loggingConsistency'
  | 'recentAverages'
  | 'weeklySummary'
  | 'monthlySummary'
  | 'compareRanges'

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
  foodReactions: true,
  loggingConsistency: true,
  recentAverages: true,
  weeklySummary: true,
  monthlySummary: true,
  compareRanges: true,
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
