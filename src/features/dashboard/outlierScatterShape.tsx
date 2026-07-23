import type { ReactElement } from 'react'

interface OutlierShapeProps {
  cx?: number
  cy?: number
  payload?: {
    isOutlier?: boolean
    isExcluded?: boolean
  }
}

/**
 * Custom Scatter point renderer (#224) — a flagged outlier point (Tukey's
 * fences on either axis, `domain/stats/outlierDetection.ts`) renders in a
 * distinct color; one the user has since excluded (`OutlierPointsList.tsx`)
 * renders dimmed instead, so it's still visible on the chart (context for
 * "why is this pattern different now") without counting toward the
 * summary math anymore. Everything else keeps the chart's own default
 * fill. Passed as `<Scatter shape={...}>` — recharts calls it per point
 * with that point's own `payload` (the full data object passed to
 * `Scatter`'s `data` prop).
 */
export function renderOutlierScatterShape(defaultFill: string) {
  return function OutlierScatterShape(props: OutlierShapeProps): ReactElement {
    const { cx = 0, cy = 0, payload } = props
    const isOutlier = payload?.isOutlier ?? false
    const isExcluded = payload?.isExcluded ?? false
    return (
      <circle
        cx={cx}
        cy={cy}
        r={isOutlier ? 5 : 3}
        fill={isOutlier ? 'var(--destructive)' : defaultFill}
        opacity={isExcluded ? 0.3 : 1}
      />
    )
  }
}
