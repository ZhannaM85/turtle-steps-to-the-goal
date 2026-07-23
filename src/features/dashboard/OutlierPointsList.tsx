import { useTranslation } from '@/i18n'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'

/**
 * #224 — shared across every correlation view: the accessible, tappable
 * counterpart to a flagged outlier point on the scatter chart above it.
 * Real buttons rather than relying on tapping a tiny SVG dot (recharts
 * scatter points are an unreliable touch target, and — per #275's own
 * reasoning for chart-tap navigation — an explicit interactive element
 * reads better than "tap anywhere on the chart"). Renders nothing when
 * there's nothing flagged and nothing already excluded.
 */
export function OutlierPointsList<T>({
  points,
  isExcluded,
  onToggle,
  getKey,
  formatLabel,
}: {
  points: T[]
  isExcluded: (point: T) => boolean
  onToggle: (point: T) => void
  getKey: (point: T) => string
  formatLabel: (point: T) => string
}) {
  const t = useTranslation()

  if (points.length === 0) return null

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border px-3 py-2">
      <span className="text-xs font-medium text-muted-foreground">
        {t.dashboard.outlierPointsHeading}
      </span>
      <div className="flex flex-wrap gap-2">
        {points.map((point) => {
          const excluded = isExcluded(point)
          const label = formatLabel(point)
          return (
            <Button
              key={getKey(point)}
              type="button"
              variant={excluded ? 'ghost' : 'outline'}
              size="sm"
              aria-pressed={excluded}
              aria-label={
                excluded
                  ? t.dashboard.restoreOutlierLabel(label)
                  : t.dashboard.excludeOutlierLabel(label)
              }
              onClick={() => onToggle(point)}
              className={cn(excluded && 'text-muted-foreground line-through')}
            >
              {label}
            </Button>
          )
        })}
      </div>
    </div>
  )
}
