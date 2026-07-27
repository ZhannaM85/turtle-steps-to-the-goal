import type { CustomMetric, MetricRef } from '@/domain/customMetric'
import type { NumericSeriesKey } from '@/domain/stats'
import type { Dictionary } from '@/i18n'

/**
 * Display label for one of this app's built-in numeric fields (#336) —
 * reuses the exact same `t.*` keys `CustomChartView.tsx`'s own
 * `useNumericSeriesConfig` already uses per key, so a metric reads the
 * same whether it's picked there or here. Lives in `shared/lib` rather
 * than either feature (custom-metrics or dashboard) since both need it
 * and this codebase doesn't otherwise let one feature import from
 * another.
 */
export function builtinMetricLabel(t: Dictionary, key: NumericSeriesKey): string {
  switch (key) {
    case 'weight':
      return t.dashboard.customChartWeightLabel
    case 'calories':
      return t.dashboard.customChartCaloriesLabel
    case 'protein':
      return t.dailyEntry.proteinLabel
    case 'fat':
      return t.dailyEntry.fatLabel
    case 'carbs':
      return t.dailyEntry.carbsLabel
    case 'water':
      return t.dailyEntry.waterLabel
    case 'steps':
      return t.dailyEntry.stepsLabel
    case 'waist':
      return t.dailyEntry.waistLabel
    case 'hip':
      return t.dailyEntry.hipLabel
    case 'bodyFat':
      return t.dailyEntry.bodyFatLabel
    case 'fastingHours':
      return t.dashboard.fastingHoursLegend
  }
}

/** Resolves a `MetricRef` (either side of a `CustomCorrelation`) to its
 * display label — a built-in field's translated name, or a `CustomMetric`'s
 * own user-given name. Falls back to the raw id if a custom metric was
 * somehow deleted out from under a still-referenced correlation (shouldn't
 * happen — `useCustomCorrelationStore.deleteCorrelationsReferencingMetric`
 * cascades this — but reading a stale id is friendlier than crashing). */
export function metricRefLabel(
  t: Dictionary,
  ref: MetricRef,
  customMetrics: CustomMetric[],
): string {
  if (ref.kind === 'builtin') return builtinMetricLabel(t, ref.key)
  return customMetrics.find((m) => m.id === ref.metricId)?.name ?? ref.metricId
}
