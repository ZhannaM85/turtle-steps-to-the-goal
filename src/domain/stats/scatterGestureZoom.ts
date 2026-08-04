/** #581 — axis-domain zoom window for correlation scatter charts. */

export interface ScatterZoomDomain {
  xMin: number
  xMax: number
  yMin: number
  yMax: number
}

/** Smallest fraction of the full span that must stay visible on each axis. */
export const SCATTER_ZOOM_MIN_FRACTION = 0.08

/** Need at least this many points before pinch-zoom is offered. */
export const SCATTER_ZOOM_MIN_POINTS = 4

function padExtent(min: number, max: number, padRatio: number): [number, number] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1]
  if (min === max) {
    const pad = Math.abs(min) > 0 ? Math.abs(min) * 0.05 : 1
    return [min - pad, max + pad]
  }
  const pad = (max - min) * padRatio
  return [min - pad, max + pad]
}

export function scatterDomainFromValues(
  xs: readonly number[],
  ys: readonly number[],
  padRatio: number = 0.05,
): ScatterZoomDomain | null {
  if (xs.length === 0 || ys.length === 0) return null
  const [xMin, xMax] = padExtent(Math.min(...xs), Math.max(...xs), padRatio)
  const [yMin, yMax] = padExtent(Math.min(...ys), Math.max(...ys), padRatio)
  return { xMin, xMax, yMin, yMax }
}

function nearlyEqual(a: number, b: number): boolean {
  return Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b))
}

function domainsEqual(a: ScatterZoomDomain, b: ScatterZoomDomain): boolean {
  return (
    nearlyEqual(a.xMin, b.xMin) &&
    nearlyEqual(a.xMax, b.xMax) &&
    nearlyEqual(a.yMin, b.yMin) &&
    nearlyEqual(a.yMax, b.yMax)
  )
}

/**
 * Clamp `window` inside `full`, enforce a minimum span per axis, and return
 * `null` when the result is the full domain (not zoomed).
 */
export function clampScatterDomain(
  window: ScatterZoomDomain,
  full: ScatterZoomDomain,
  minFraction: number = SCATTER_ZOOM_MIN_FRACTION,
): ScatterZoomDomain | null {
  const fullX = full.xMax - full.xMin
  const fullY = full.yMax - full.yMin
  if (fullX <= 0 || fullY <= 0) return null

  const minX = Math.max(fullX * minFraction, Number.EPSILON)
  const minY = Math.max(fullY * minFraction, Number.EPSILON)

  let xMin = Math.min(window.xMin, window.xMax)
  let xMax = Math.max(window.xMin, window.xMax)
  let yMin = Math.min(window.yMin, window.yMax)
  let yMax = Math.max(window.yMin, window.yMax)

  if (xMax - xMin < minX) {
    const mid = (xMin + xMax) / 2
    xMin = mid - minX / 2
    xMax = mid + minX / 2
  }
  if (yMax - yMin < minY) {
    const mid = (yMin + yMax) / 2
    yMin = mid - minY / 2
    yMax = mid + minY / 2
  }

  if (xMin < full.xMin) {
    xMax += full.xMin - xMin
    xMin = full.xMin
  }
  if (xMax > full.xMax) {
    xMin -= xMax - full.xMax
    xMax = full.xMax
  }
  if (yMin < full.yMin) {
    yMax += full.yMin - yMin
    yMin = full.yMin
  }
  if (yMax > full.yMax) {
    yMin -= yMax - full.yMax
    yMax = full.yMax
  }

  xMin = Math.max(full.xMin, xMin)
  xMax = Math.min(full.xMax, xMax)
  yMin = Math.max(full.yMin, yMin)
  yMax = Math.min(full.yMax, yMax)

  const next = { xMin, xMax, yMin, yMax }
  if (domainsEqual(next, full)) return null
  return next
}

/**
 * Pinch: `scale > 1` zooms in (narrower domain), `scale < 1` zooms out.
 * Focus ratios are 0..1 within the current window (left→right, bottom→top
 * in data space — callers convert from screen Y).
 */
export function zoomScatterDomainByScale(
  window: ScatterZoomDomain | null,
  full: ScatterZoomDomain,
  scale: number,
  focusXRatio: number = 0.5,
  focusYRatio: number = 0.5,
  minFraction: number = SCATTER_ZOOM_MIN_FRACTION,
): ScatterZoomDomain | null {
  if (!Number.isFinite(scale) || scale <= 0) {
    return clampScatterDomain(window ?? full, full, minFraction)
  }

  const current = window ?? full
  const xSpan = current.xMax - current.xMin
  const ySpan = current.yMax - current.yMin
  const nextXSpan = Math.min(full.xMax - full.xMin, Math.max(0, xSpan / scale))
  const nextYSpan = Math.min(full.yMax - full.yMin, Math.max(0, ySpan / scale))
  const focusX = current.xMin + focusXRatio * xSpan
  const focusY = current.yMin + focusYRatio * ySpan
  return clampScatterDomain(
    {
      xMin: focusX - focusXRatio * nextXSpan,
      xMax: focusX - focusXRatio * nextXSpan + nextXSpan,
      yMin: focusY - focusYRatio * nextYSpan,
      yMax: focusY - focusYRatio * nextYSpan + nextYSpan,
    },
    full,
    minFraction,
  )
}

/**
 * Pan by fractions of the current window size. Positive `dxRatio` follows a
 * finger moving right (show data further left). Positive `dyRatio` follows a
 * finger moving down in screen space (show higher data values).
 */
export function panScatterDomain(
  window: ScatterZoomDomain,
  full: ScatterZoomDomain,
  dxRatio: number,
  dyRatio: number,
  minFraction: number = SCATTER_ZOOM_MIN_FRACTION,
): ScatterZoomDomain | null {
  const xSpan = window.xMax - window.xMin
  const ySpan = window.yMax - window.yMin
  return clampScatterDomain(
    {
      xMin: window.xMin - dxRatio * xSpan,
      xMax: window.xMax - dxRatio * xSpan,
      yMin: window.yMin + dyRatio * ySpan,
      yMax: window.yMax + dyRatio * ySpan,
    },
    full,
    minFraction,
  )
}
