import { useMemo, useState, type ReactNode } from 'react'
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
    /** Always a memoized `[min,max]` from the padded full domain or the
     * active zoom window. Must stay explicit: Recharts 3 +
     * `allowDataOverflow` with `domain={undefined}` floors Y at 0 (#593)
     * and breaks ticks when zooming (#592). Value-memoized so unzoomed
     * re-renders do not allocate a fresh tuple (#587 crash). */
    xDomain: [number, number] | undefined
    yDomain: [number, number] | undefined
    isGesturing: boolean
    /**
     * #713 — pass to `<Tooltip active={...} />`. False while gesturing or
     * after dismiss; undefined lets Recharts own click-open.
     */
    tooltipActive: boolean | undefined
    dismissTooltip: () => void
    revealTooltip: () => void
  }) => ReactNode
}

/**
 * #581 — wraps a correlation `ScatterChart` with pinch/pan/double-tap zoom
 * and a Reset zoom row matching trend charts (#543/#560).
 * #587 — domain tuples are memoized by value so Recharts does not see a new
 * array identity on every parent render (that regressed into
 * RouteErrorFallback while scrolling Dashboard).
 * #592/#593 — always publish the padded full domain when unzoomed (not
 * `undefined`): with `allowDataOverflow`, Recharts auto `[0,'auto']` clips
 * negative weight-change and produces garbage ticks under zoom.
 * #713 — owns tooltip suppress/reveal so click-triggered tooltips can close.
 */
export function ZoomableScatterSurface({
  resetKey,
  xValues,
  yValues,
  fullDomainOverride,
  children,
}: ZoomableScatterSurfaceProps) {
  const t = useTranslation()
  const [tooltipSuppressed, setTooltipSuppressed] = useState(false)
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

  // Zoom window when zoomed; otherwise the padded full domain (always
  // explicit — see #592/#593).
  const axisDomain = isZoomed ? domain : fullDomain
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

  const tooltipActive =
    isGesturing || tooltipSuppressed ? false : undefined

  return (
    <>
      <div ref={surfaceRef} className="touch-pan-y">
        {children({
          xDomain,
          yDomain,
          isGesturing,
          tooltipActive,
          dismissTooltip: () => setTooltipSuppressed(true),
          revealTooltip: () => setTooltipSuppressed(false),
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
