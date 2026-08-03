/** #543 — X-axis zoom window over a chart's sorted date points (indices). */
export interface ChartZoomWindow {
  startIndex: number
  endIndex: number
}

/** Minimum visible points so a pinch can't collapse to a useless single day. */
export const CHART_ZOOM_MIN_SPAN = 7

export function clampZoomWindow(
  window: ChartZoomWindow,
  pointCount: number,
  minSpan: number = CHART_ZOOM_MIN_SPAN,
): ChartZoomWindow | null {
  if (pointCount <= 0) return null
  const span = Math.min(minSpan, pointCount)
  if (pointCount <= span) return null

  let start = Math.max(0, Math.min(window.startIndex, pointCount - 1))
  let end = Math.max(0, Math.min(window.endIndex, pointCount - 1))
  if (end < start) [start, end] = [end, start]
  if (end - start + 1 < span) {
    end = Math.min(pointCount - 1, start + span - 1)
    start = Math.max(0, end - span + 1)
  }
  if (start === 0 && end === pointCount - 1) return null
  return { startIndex: start, endIndex: end }
}

/**
 * Pinch: `scale > 1` zooms in (narrower window), `scale < 1` zooms out.
 * Keeps the focal index (0..1 through the current window) roughly centered.
 */
export function zoomWindowByScale(
  window: ChartZoomWindow | null,
  pointCount: number,
  scale: number,
  focusRatio: number = 0.5,
  minSpan: number = CHART_ZOOM_MIN_SPAN,
): ChartZoomWindow | null {
  if (pointCount <= minSpan || !Number.isFinite(scale) || scale <= 0) {
    return clampZoomWindow(
      window ?? { startIndex: 0, endIndex: pointCount - 1 },
      pointCount,
      minSpan,
    )
  }

  const current =
    window ?? ({ startIndex: 0, endIndex: pointCount - 1 } as ChartZoomWindow)
  const currentSpan = current.endIndex - current.startIndex + 1
  const nextSpan = Math.max(
    minSpan,
    Math.min(pointCount, Math.round(currentSpan / scale)),
  )
  const focus = current.startIndex + focusRatio * (currentSpan - 1)
  const start = Math.round(focus - focusRatio * (nextSpan - 1))
  return clampZoomWindow(
    { startIndex: start, endIndex: start + nextSpan - 1 },
    pointCount,
    minSpan,
  )
}

/** Pan by whole points; positive delta moves the window toward newer dates. */
export function panZoomWindow(
  window: ChartZoomWindow,
  pointCount: number,
  deltaIndices: number,
  minSpan: number = CHART_ZOOM_MIN_SPAN,
): ChartZoomWindow | null {
  return clampZoomWindow(
    {
      startIndex: window.startIndex + deltaIndices,
      endIndex: window.endIndex + deltaIndices,
    },
    pointCount,
    minSpan,
  )
}

export function sliceByZoomWindow<T>(
  items: readonly T[],
  window: ChartZoomWindow | null,
): T[] {
  if (!window) return [...items]
  return items.slice(window.startIndex, window.endIndex + 1)
}
