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
    xDomain: [number, number]
    yDomain: [number, number]
    isGesturing: boolean
  }) => ReactNode
}

/**
 * #581 — wraps a correlation `ScatterChart` with pinch/pan/double-tap zoom
 * and a Reset zoom row matching trend charts (#543/#560).
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

  if (!domain) return null

  return (
    <>
      <div ref={surfaceRef} className="touch-pan-y">
        {children({
          xDomain: [domain.xMin, domain.xMax],
          yDomain: [domain.yMin, domain.yMax],
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
