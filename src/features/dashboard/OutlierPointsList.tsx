import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
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
 *
 * #372 — a small separate link icon next to each chip navigates to that
 * day in History, resolved via `AskUserQuestion` as a distinct action from
 * the chip's own tap-to-exclude rather than overloading that existing tap.
 * `getDate` is a separate prop from `getKey`/`formatLabel` since a couple
 * of callers key/label by `weekStart` (a week, not a single day) but still
 * have a sensible single date to navigate to (that week's start).
 */
export function OutlierPointsList<T>({
  points,
  isExcluded,
  onToggle,
  getKey,
  getDate,
  formatLabel,
}: {
  points: T[]
  isExcluded: (point: T) => boolean
  onToggle: (point: T) => void
  getKey: (point: T) => string
  getDate: (point: T) => string
  formatLabel: (point: T) => string
}) {
  const t = useTranslation()

  if (points.length === 0) return null

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border px-3 py-2">
      <span className="text-xs font-medium text-muted-foreground">
        {t.dashboard.outlierPointsHeading}
      </span>
      {/* #374 — a multi-year dataset can flag dozens of outliers on one
       * view; a max-height scrollable container (rather than pagination)
       * keeps the list from pushing the rest of the Dashboard far down the
       * page, without adding new interactive state of its own. */}
      <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
        {points.map((point) => {
          const excluded = isExcluded(point)
          const label = formatLabel(point)
          return (
            <div key={getKey(point)} className="flex items-center gap-0.5">
              <Button
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
                className={cn(
                  excluded && 'text-muted-foreground line-through',
                )}
              >
                {label}
              </Button>
              <Link
                to={`/history?date=${getDate(point)}`}
                aria-label={t.dashboard.viewOutlierDayLabel(label)}
                className="flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <ArrowUpRight aria-hidden="true" className="size-3.5" />
              </Link>
            </div>
          )
        })}
      </div>
    </div>
  )
}
