import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { TrendChartPeriod } from '@/domain/stats'
import type { DashboardChartKey } from './dashboardChartVisibilityStore'

/**
 * #536 — Dashboard sections that own an independent time span (was one
 * global control in #380/#396). Summaries / heatmaps / compare-ranges keep
 * their own logic and are deliberately excluded.
 */
export const DASHBOARD_PERIOD_CHART_KEYS = [
  'weight',
  'calories',
  'macros',
  'bodyComposition',
  'electrolytes',
  'customChart',
  'calorieWeightCorrelation',
  'lateMealCorrelation',
  'mealFrequencyCorrelation',
  'fastingWindowCorrelation',
  'sleepCorrelation',
  'stepsCorrelation',
  'proteinCorrelation',
  'nightEatingCorrelation',
  'alcoholCorrelation',
] as const satisfies readonly DashboardChartKey[]

export type DashboardPeriodChartKey = (typeof DASHBOARD_PERIOD_CHART_KEYS)[number]

export function isDashboardPeriodChartKey(
  chart: DashboardChartKey,
): chart is DashboardPeriodChartKey {
  return (DASHBOARD_PERIOD_CHART_KEYS as readonly string[]).includes(chart)
}

export interface ChartPeriodSelection {
  period: TrendChartPeriod
  customStart: string
  customEnd: string
}

const DEFAULT_SELECTION: ChartPeriodSelection = {
  period: 'all',
  customStart: '',
  customEnd: '',
}

function defaultByChart(): Record<DashboardPeriodChartKey, ChartPeriodSelection> {
  return Object.fromEntries(
    DASHBOARD_PERIOD_CHART_KEYS.map((key) => [key, { ...DEFAULT_SELECTION }]),
  ) as Record<DashboardPeriodChartKey, ChartPeriodSelection>
}

interface DashboardPeriodState {
  byChart: Record<DashboardPeriodChartKey, ChartPeriodSelection>
  setPeriod: (chart: DashboardPeriodChartKey, period: TrendChartPeriod) => void
  setCustomStart: (chart: DashboardPeriodChartKey, date: string) => void
  setCustomEnd: (chart: DashboardPeriodChartKey, date: string) => void
}

/** #380 global shape — still accepted once via persist migrate (#536). */
type LegacyPersisted = {
  period?: TrendChartPeriod
  customStart?: string
  customEnd?: string
  byChart?: Partial<Record<DashboardPeriodChartKey, ChartPeriodSelection>>
}

/**
 * #536 — per-chart Dashboard period (replaces the single global selection
 * from #380). Same local-preference category as before — not in the export
 * bundle. Defaults to `'all'` per chart; migrating users keep their previous
 * global choice applied to every chart once.
 */
export const useDashboardPeriodStore = create<DashboardPeriodState>()(
  persist(
    (set) => ({
      byChart: defaultByChart(),
      setPeriod: (chart, period) =>
        set((state) => ({
          byChart: {
            ...state.byChart,
            [chart]: { ...state.byChart[chart], period },
          },
        })),
      setCustomStart: (chart, customStart) =>
        set((state) => ({
          byChart: {
            ...state.byChart,
            [chart]: { ...state.byChart[chart], customStart },
          },
        })),
      setCustomEnd: (chart, customEnd) =>
        set((state) => ({
          byChart: {
            ...state.byChart,
            [chart]: { ...state.byChart[chart], customEnd },
          },
        })),
    }),
    {
      name: 'turtle-steps-dashboard-period',
      storage: createJSONStorage(() => localStorage),
      merge: (persisted, current) => {
        const raw = (persisted ?? {}) as LegacyPersisted
        if (raw.byChart && typeof raw.byChart === 'object') {
          return {
            ...current,
            byChart: {
              ...defaultByChart(),
              ...Object.fromEntries(
                DASHBOARD_PERIOD_CHART_KEYS.map((key) => [
                  key,
                  {
                    ...DEFAULT_SELECTION,
                    ...raw.byChart?.[key],
                  },
                ]),
              ),
            },
          }
        }
        // Pre-#536: one global period — seed every chart with it.
        if (raw.period !== undefined) {
          const seed: ChartPeriodSelection = {
            period: raw.period,
            customStart: raw.customStart ?? '',
            customEnd: raw.customEnd ?? '',
          }
          return {
            ...current,
            byChart: Object.fromEntries(
              DASHBOARD_PERIOD_CHART_KEYS.map((key) => [key, { ...seed }]),
            ) as Record<DashboardPeriodChartKey, ChartPeriodSelection>,
          }
        }
        return current
      },
    },
  ),
)
