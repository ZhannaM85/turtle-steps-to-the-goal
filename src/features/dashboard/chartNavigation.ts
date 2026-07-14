export interface ChartClickState {
  activeLabel?: string | number
  activePayload?: { dataKey?: string; value?: number | null }[]
}

/**
 * Resolves a Recharts container click into a History date, or null if the
 * click missed a point entirely or landed on a series with no real logged
 * value at that date (e.g. the dashed projection line, which has no
 * History entry behind it).
 */
export function resolveChartClickDate(
  state: ChartClickState,
  dataKey: string,
): string | null {
  const date = state?.activeLabel
  if (date === undefined || date === null) return null
  const hasValue = state.activePayload?.some(
    (point) =>
      point.dataKey === dataKey &&
      point.value !== undefined &&
      point.value !== null,
  )
  return hasValue ? String(date) : null
}
