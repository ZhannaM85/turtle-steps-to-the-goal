import { format, parseISO } from 'date-fns'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getDateFnsLocale, useLocale, useTranslation } from '@/i18n'

interface CorrelationTooltipEntry {
  name?: string | number
  value?: string | number | Array<string | number>
  dataKey?: string | number
  /** The full Scatter `data` object behind the point — every correlation
   * view puts its own `date` (or, for the weekly views, that week's start)
   * on it so the link below has somewhere to go. */
  payload?: { date?: string }
}

export interface CorrelationChartTooltipProps {
  /** Each view's own value formatting — the same logic that used to live in
   * its `<Tooltip formatter>` prop, minus the `[value, name]` tuple recharts
   * wanted. Kept per-view because the units differ wildly (steps, hours,
   * kcal, a Yes/No label). */
  formatValue: (value: number, name: string) => string
  /** Injected by recharts, which clones this element with the live tooltip
   * props — never passed by the callers themselves. */
  active?: boolean
  payload?: CorrelationTooltipEntry[]
}

/**
 * #489 — shared tooltip content for every correlation scatter view. Before
 * this, those charts used recharts' default tooltip, which shows the point's
 * values and nothing else: reported live as "I can see the outlier day's
 * numbers but there's no way to go fix it." Navigation only existed on the
 * `OutlierPointsList` chips below the chart (#372/#389), so a point that
 * wasn't flagged as an outlier had no route to its day at all.
 *
 * Mirrors `WeightTrendChart`'s own in-tooltip link (#442), including the two
 * non-obvious bits that make it actually tappable: `wrapperStyle` must
 * re-enable pointer events at the call site (recharts sets
 * `pointer-events: none` on the tooltip wrapper so hovering it doesn't
 * interrupt the chart's mouse tracking), and move events have to stop
 * propagating here so a finger drifting toward the link doesn't retarget the
 * active point mid-tap and navigate to a different day than the one shown.
 */
export function CorrelationChartTooltip({
  formatValue,
  active,
  payload,
}: CorrelationChartTooltipProps) {
  const t = useTranslation()
  const dateFnsLocale = getDateFnsLocale(useLocale())

  if (!active || !payload || payload.length === 0) return null

  const date = payload[0]?.payload?.date

  return (
    <div
      className="rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md"
      onMouseMove={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
    >
      {date && (
        <p className="mb-1 font-medium">
          {format(parseISO(date), 'PP', { locale: dateFnsLocale })}
        </p>
      )}
      {payload.map((item, index) => {
        const name = String(item.name ?? '')
        return (
          <p key={String(item.dataKey ?? index)}>
            {name}: {formatValue(Number(item.value), name)}
          </p>
        )
      })}
      {date && (
        <Link
          to={`/?date=${date}`}
          className="mt-1.5 flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
        >
          {t.dashboard.viewDayLink}
          <ArrowRight aria-hidden="true" className="size-3" />
        </Link>
      )}
    </div>
  )
}
