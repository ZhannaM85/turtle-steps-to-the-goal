import type { DailyEntry } from '@/domain/dailyEntry'
import {
  filterEntriesByTrendChartPeriod,
  resolveTrendChartPeriodRange,
} from '@/domain/stats'
import {
  useDashboardPeriodStore,
  type ChartPeriodSelection,
  type DashboardPeriodChartKey,
} from '@/stores'

/**
 * #537 — subscribe to **one** chart's period only. `DashboardScreen` must
 * not read the whole `byChart` map: zustand replaces that object on every
 * `setPeriod`, which re-rendered every Dashboard section (weekly cards,
 * heatmaps, every other Recharts chart) for a single Week/Month/Year
 * toggle — ~10s with multi-year data after #536 made the control per-chart.
 *
 * Other charts' selection objects keep the same reference when this key
 * updates (`...state.byChart`), so this selector does not re-render them.
 */
export function useDashboardChartPeriod(
  chart: DashboardPeriodChartKey,
): ChartPeriodSelection {
  return useDashboardPeriodStore((state) => state.byChart[chart])
}

/** #536/#537 — correlation cards filter the full entry set by their own
 * stored period; callers must pass the unfiltered list. */
export function usePeriodFilteredEntries(
  chart: DashboardPeriodChartKey,
  entries: DailyEntry[],
): DailyEntry[] {
  const { period, customStart, customEnd } = useDashboardChartPeriod(chart)
  return filterEntriesByTrendChartPeriod(
    entries,
    resolveTrendChartPeriodRange(period, customStart, customEnd),
  )
}
