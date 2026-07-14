export interface ChartClickState {
  activeLabel?: string | number
}

/**
 * Resolves a Recharts container click into a History date, or null if the
 * click missed a point entirely or landed on a date with no real logged
 * value for the series being navigated (e.g. a rolling-average point that
 * exists without a same-day calorie entry behind it).
 *
 * Deliberately looks the date up in the chart's own `data` array rather
 * than trusting Recharts' `activeDataKey`/`activePayload` to identify which
 * series was clicked — Recharts 3's real click state only exposes
 * `activeDataKey` (a single key, not per-series values), which doesn't
 * reliably distinguish "this series has no value here" on a combo chart.
 * `data` + `hasValue` is unambiguous and something this app already owns.
 */
export function resolveChartClickDate<T extends { date: string }>(
  state: ChartClickState,
  data: T[],
  hasValue: (point: T) => boolean,
): string | null {
  if (state.activeLabel === undefined || state.activeLabel === null) {
    return null
  }
  const date = String(state.activeLabel)
  const point = data.find((p) => p.date === date)
  return point && hasValue(point) ? date : null
}
