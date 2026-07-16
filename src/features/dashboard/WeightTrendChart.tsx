import { format, parseISO } from 'date-fns'
import { ArrowRight } from 'lucide-react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type DotItemDotProps,
  type TooltipContentProps,
} from 'recharts'
import { Link } from 'react-router-dom'
import type { DailyEntry } from '@/domain/dailyEntry'
import { kgToLb } from '@/domain/goal'
import {
  formatNumber,
  getDateFnsLocale,
  unitLabel,
  useLocale,
  useTranslation,
} from '@/i18n'
import { useUnitStore } from '@/stores'
import { resolveChartClickDate } from './chartNavigation'

export interface WeightTrendChartProps {
  entries: DailyEntry[]
}

export function WeightTrendChart({ entries }: WeightTrendChartProps) {
  const t = useTranslation()
  const locale = useLocale()
  const dateFnsLocale = getDateFnsLocale(locale)
  const displayUnit = useUnitStore((state) => state.unit)
  const toDisplay = (kg: number) => (displayUnit === 'lb' ? kgToLb(kg) : kg)

  const data = entries
    .filter(
      (entry): entry is DailyEntry & { weightKg: number } =>
        entry.weightKg !== undefined,
    )
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((entry) => ({ date: entry.date, weight: toDisplay(entry.weightKg) }))

  if (data.length === 0) return null

  const lastWeightIndex = data.length - 1

  const unit = unitLabel(displayUnit, t)

  // Tapping/hovering a point only ever shows the tooltip (#49) — the
  // in-tooltip link is the sole way to navigate, so a stray tap elsewhere
  // on the chart doesn't yank the user away from just glancing at values.
  // Recharts' tooltip wrapper is pointer-events:none by default (so
  // hovering the tooltip itself doesn't interrupt mouse tracking on the
  // chart) — wrapperStyle below re-enables it so the link is clickable.
  function renderTooltip({ active, label, payload }: TooltipContentProps) {
    if (!active || !payload || payload.length === 0) return null
    const value = payload[0]?.value
    if (value === undefined || value === null) return null
    const date = resolveChartClickDate(
      { activeLabel: label },
      data,
      (point) => point.weight !== undefined,
    )
    return (
      <div
        className="rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md"
        // Recharts tracks the active point via move events bubbling up to
        // its wrapper div, which this tooltip is a child of. Without this,
        // a finger drifting from "tap to open" toward the link below (#33)
        // can silently retarget the active point to whichever date the
        // tooltip box happens to overlap, so the link navigates to a
        // different day than the one still visibly shown in the text.
        onMouseMove={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        <p className="mb-1 font-medium">
          {format(parseISO(String(label)), 'PP', { locale: dateFnsLocale })}
        </p>
        <p>
          {formatNumber(Number(value), locale)} {unit} ·{' '}
          {t.dashboard.weightLegend}
        </p>
        {date && (
          <Link
            to={`/history?date=${date}`}
            className="mt-1.5 flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
          >
            {t.dashboard.viewDayLink}
            <ArrowRight aria-hidden="true" className="size-3" />
          </Link>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <ResponsiveContainer width="100%" height={180}>
        <LineChart
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
            tickFormatter={(date: string) =>
              format(parseISO(date), 'MMM d', { locale: dateFnsLocale })
            }
            axisLine={{ stroke: 'var(--border)' }}
            tickLine={false}
          />
          <YAxis
            width={40}
            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
            axisLine={false}
            tickLine={false}
            domain={['auto', 'auto']}
          />
          <Tooltip
            content={renderTooltip}
            wrapperStyle={{ pointerEvents: 'auto' }}
          />
          <Line
            type="monotone"
            dataKey="weight"
            stroke="var(--chart-weight)"
            strokeWidth={2.5}
            connectNulls={false}
            dot={(props: DotItemDotProps) => {
              const { cx, cy, index } = props
              if (index !== lastWeightIndex || cx == null || cy == null) {
                return <g key={index} />
              }
              return (
                <circle
                  key={index}
                  cx={cx}
                  cy={cy}
                  r={3.5}
                  fill="var(--chart-weight)"
                />
              )
            }}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <span className="flex gap-3 text-xs text-muted-foreground">
        <i className="flex items-center gap-1 not-italic">
          <span
            aria-hidden="true"
            className="size-2 rounded-sm"
            style={{ background: 'var(--chart-weight)' }}
          />
          {t.dashboard.weightLegend}
        </i>
      </span>
      <p className="text-xs text-muted-foreground">
        {t.dashboard.chartNavigationHint}
      </p>
    </div>
  )
}
