import { useMemo, type ReactNode } from 'react'
import {
  scatterDomainFromValues,
  type ScatterZoomDomain,
} from '@/domain/stats/scatterGestureZoom'
import { useTranslation } from '@/i18n'
import { Button } from '@/shared/ui/button'
import { useScatterGestureZoom } from './useScatterGestureZoom'

export interface ZoomableScatterSurfaceProps {
  /** Resets zoom when period/data identity changes. */
  resetKey: string
  xValues: readonly number[]
  yValues: readonly number[]
  /** Optional fixed full domain (e.g. night-eating's categorical x). */
  fullDomainOverride?: ScatterZoomDomain | null
  children: (ctx: {
    /** Set while zoomed, or when `fullDomainOverride` is provided. `undefined`
     * restores Recharts auto-scale (#587 — always forcing a fresh padded
     * `[min,max]` tuple every render regressed into RouteErrorFallback on
     * device while scrolling Dashboard). */
    xDomain: [number, number] | undefined
    yDomain: [number, number] | undefined
    isGesturing: boolean
  }) => ReactNode
}

/**
 * #581 — wraps a correlation `ScatterChart` with pinch/pan/double-tap zoom
 * and a Reset zoom row matching trend charts (#543/#560).
 * #587 — only push explicit axis domains while zoomed (or when the caller
 * supplied a fixed full-domain override); otherwise leave axes on Recharts
 * auto like pre-#581. Domain tuples are memoized by value so Recharts does
 * not see a new array identity on every parent render.
 */
export function ZoomableScatterSurface({
  resetKey,
  xValues,
  yValues,
  fullDomainOverride,
  children,
}: ZoomableScatterSurfaceProps) {
  const t = useTranslation()
  const xMin = xValues.length > 0 ? Math.min(...xValues) : 0
  const xMax = xValues.length > 0 ? Math.max(...xValues) : 0
  const yMin = yValues.length > 0 ? Math.min(...yValues) : 0
  const yMax = yValues.length > 0 ? Math.max(...yValues) : 0

  const fullDomain = useMemo(() => {
    if (fullDomainOverride) return fullDomainOverride
    return scatterDomainFromValues(xValues, yValues)
    // Extents (not array identity) drive recomputation.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [
    fullDomainOverride?.xMin,
    fullDomainOverride?.xMax,
    fullDomainOverride?.yMin,
    fullDomainOverride?.yMax,
    xMin,
    xMax,
    yMin,
    yMax,
    xValues.length,
    yValues.length,
  ])

  const pointCount = Math.min(xValues.length, yValues.length)
  const { surfaceRef, domain, isZoomed, isGesturing, resetZoom } =
    useScatterGestureZoom(resetKey, fullDomain, pointCount)

  // Axis domains for the chart: zoom window, else optional override, else
  // leave undefined so Recharts auto-scales (pre-#581 default for most
  // correlation views).
  const axisDomain = isZoomed ? domain : fullDomainOverride ? fullDomain : null
  const axisXMin = axisDomain?.xMin
  const axisXMax = axisDomain?.xMax
  const axisYMin = axisDomain?.yMin
  const axisYMax = axisDomain?.yMax

  const xDomain = useMemo((): [number, number] | undefined => {
    if (axisXMin === undefined || axisXMax === undefined) return undefined
    return [axisXMin, axisXMax]
  }, [axisXMin, axisXMax])

  const yDomain = useMemo((): [number, number] | undefined => {
    if (axisYMin === undefined || axisYMax === undefined) return undefined
    return [axisYMin, axisYMax]
  }, [axisYMin, axisYMax])

  // Still need a full domain for gesture math; without points there is nothing
  // to plot (callers usually early-return before mounting this).
  if (!fullDomain) return null

  return (
    <>
      <div ref={surfaceRef} className="touch-pan-y">
        {children({
          xDomain,
          yDomain,
          isGesturing,
        })}
      </div>
      {isZoomed && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {t.dashboard.customChartZoomHint}
          </p>
          <Button type="button" variant="ghost" size="sm" onClick={resetZoom}>
            {t.dashboard.customChartResetZoomButton}
          </Button>
        </div>
      )}
    </>
  )
}
