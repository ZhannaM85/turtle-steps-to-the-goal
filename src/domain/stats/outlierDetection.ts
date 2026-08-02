/**
 * Deterministic "boxplot" outlier rule (Tukey's fences, 1.5×IQR) — no
 * distributional assumptions, no black-box model, consistent with this
 * app's existing arithmetic-only correlation infrastructure
 * (correlationStrength.ts's own fixed-threshold approach, not a real
 * statistical test). A value is flagged if it falls outside
 * [Q1 - 1.5×IQR, Q3 + 1.5×IQR] — the same rule most boxplot charts use to
 * mark a point as an outlier. #224.
 */

function quartile(sortedValues: number[], q: number): number {
  const pos = (sortedValues.length - 1) * q
  const base = Math.floor(pos)
  const rest = pos - base
  const next = sortedValues[base + 1]
  return next === undefined
    ? sortedValues[base]
    : sortedValues[base] + rest * (next - sortedValues[base])
}

export interface OutlierBounds {
  lower: number
  upper: number
}

/** #524 — which axis (or both) triggered Tukey's fences for a point. */
export interface OutlierAxes {
  onX: boolean
  onY: boolean
}

/** Needs at least 4 values for Q1/Q3 to mean anything — returns null (no
 * bounds, nothing ever flagged) with fewer than that. */
export function outlierBounds(values: number[]): OutlierBounds | null {
  if (values.length < 4) return null
  const sorted = [...values].sort((a, b) => a - b)
  const q1 = quartile(sorted, 0.25)
  const q3 = quartile(sorted, 0.75)
  const iqr = q3 - q1
  return { lower: q1 - 1.5 * iqr, upper: q3 + 1.5 * iqr }
}

export function isOutlier(value: number, bounds: OutlierBounds | null): boolean {
  if (!bounds) return false
  return value < bounds.lower || value > bounds.upper
}

/**
 * Per-point X/Y fence hits (#524) — a vacation/illness week can show up as
 * an unusual value on either axis, so either one is enough to flag the
 * point in the UI. Returns a parallel array (same index order as
 * `points`); both flags false when the point is unremarkable.
 */
export function classifyOutlierAxes<T>(
  points: T[],
  getX: (point: T) => number,
  getY: (point: T) => number,
): OutlierAxes[] {
  const xBounds = outlierBounds(points.map(getX))
  const yBounds = outlierBounds(points.map(getY))
  return points.map((point) => ({
    onX: isOutlier(getX(point), xBounds),
    onY: isOutlier(getY(point), yBounds),
  }))
}

/**
 * Flags each point whose X *or* Y value falls outside its own dimension's
 * bounds. Thin boolean wrapper over `classifyOutlierAxes` for callers that
 * only need yes/no (scatter fill, filter lists).
 */
export function flagOutliers<T>(
  points: T[],
  getX: (point: T) => number,
  getY: (point: T) => number,
): boolean[] {
  return classifyOutlierAxes(points, getX, getY).map(
    (axes) => axes.onX || axes.onY,
  )
}
