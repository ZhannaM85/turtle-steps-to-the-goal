import type { OutlierAxes } from '@/domain/stats'
import type { Dictionary } from '@/i18n/Dictionary'

/**
 * #524 — plain-language reason for a correlation outlier chip/tooltip.
 * `metricLabel` is that view's own x-axis legend. `otherAxisLabel` is only
 * needed when Y isn't weight change (custom correlations); omitted callers
 * get the shared "unusual weight change" / "… and weight change" copy.
 */
export function outlierReasonLabel(
  dashboard: Dictionary['dashboard'],
  axes: OutlierAxes,
  metricLabel: string,
  otherAxisLabel?: string,
): string {
  if (axes.onX && axes.onY) {
    return dashboard.outlierReasonBoth(
      metricLabel,
      otherAxisLabel ?? dashboard.outlierReasonWeightChangeShort,
    )
  }
  if (axes.onY) {
    return otherAxisLabel
      ? dashboard.outlierReasonMetric(otherAxisLabel)
      : dashboard.outlierReasonWeightChange
  }
  return dashboard.outlierReasonMetric(metricLabel)
}
