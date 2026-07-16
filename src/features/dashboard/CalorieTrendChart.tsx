import { format, parseISO } from 'date-fns'
import { ArrowRight } from 'lucide-react'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts'
import { Link } from 'react-router-dom'
import { totalCalories, type DailyEntry } from '@/domain/dailyEntry'
import { rollingAverage } from '@/domain/stats'
import {
  formatNumber,
  getDateFnsLocale,
  useLocale,
  useTranslation,
} from '@/i18n'
import { resolveChartClickDate } from './chartNavigation'

interface ChartPoint {
  date: string
  calories?: number
  average?: number
}

const ROLLING_WINDOW_DAYS = 7

export interface CalorieTrendChartProps {
  entries: DailyEntry[]
}

export function CalorieTrendChart({ entries }: CalorieTrendChartProps) {
  const t = useTranslation()
  const locale = useLocale()
  const dateFnsLocale = getDateFnsLocale(locale)

  const calorieBars = entries
    .map((entry) => ({
      date: entry.date,
      calories: totalCalories(entry.calorieEntries),
    }))
    .filter(
      (point): point is { date: string; calories: number } =>
        point.calories !== undefined,
    )
    .sort((a, b) => a.date.localeCompare(b.date))

  if (calorieBars.length === 0) return null

  const rolling = rollingAverage(
    entries,
    (entry) => totalCalories(entry.calorieEntries),
    ROLLING_WINDOW_DAYS,
  )
    .filter(
      (point): point is { date: string; average: number } =>
        point.average !== null,
    )
    .map((point) => ({ date: point.date, average: point.average }))

  const merged = new Map<string, ChartPoint>()
  for (const point of calorieBars) {
    merged.set(point.date, { ...merged.get(point.date), ...point })
  }
  for (const point of rolling) {
    merged.set(point.date, { ...merged.get(point.date), ...point })
  }
  const data = [...merged.values()].sort((a, b) => a.date.localeCompare(b.date))

  // Tapping/hovering a point only ever shows the tooltip (#49) — the
  // in-tooltip link is the sole way to navigate, so a stray tap elsewhere
  // on the chart doesn't yank the user away from just glancing at values.
  // Recharts' tooltip wrapper is pointer-events:none by default (so
  // hovering the tooltip itself doesn't interrupt mouse tracking on the
  // chart) — wrapperStyle below re-enables it so the link is clickable.
  function renderTooltip({ active, label, payload }: TooltipContentProps) {
    if (!active || !payload || payload.length === 0) return null
    const date = resolveChartClickDate(
      { activeLabel: label },
      data,
      (point) => point.calories !== undefined,
    )
    return (
      <div
        className="rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md"
        // See WeightTrendChart.tsx's identical handlers (#33) — prevents a
        // finger drifting toward the in-tooltip link from silently
        // retargeting Recharts' active point to a different date.
        onMouseMove={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        <p className="mb-1 font-medium">
          {format(parseISO(String(label)), 'PP', { locale: dateFnsLocale })}
        </p>
        {payload.map((item) => (
          <p key={String(item.dataKey)}>
            {formatNumber(Number(item.value), locale, 0)}{' '}
            {item.dataKey === 'average'
              ? t.dashboard.rollingAverageLegend
              : t.dashboard.caloriesLegend}
          </p>
        ))}
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
      <ResponsiveContainer width="100%" height={160}>
        <ComposedChart
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
          />
          <Tooltip
            content={renderTooltip}
            wrapperStyle={{ pointerEvents: 'auto' }}
          />
          <Bar
            dataKey="calories"
            fill="var(--chart-calories)"
            radius={[3, 3, 0, 0]}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="average"
            stroke="var(--chart-weight)"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <span className="flex gap-3 text-xs text-muted-foreground">
        <i className="flex items-center gap-1 not-italic">
          <span
            aria-hidden="true"
            className="size-2 rounded-sm"
            style={{ background: 'var(--chart-calories)' }}
          />
          {t.dashboard.caloriesLegend}
        </i>
        <i className="flex items-center gap-1 not-italic">
          <span
            aria-hidden="true"
            className="size-2 rounded-sm"
            style={{ background: 'var(--chart-weight)' }}
          />
          {t.dashboard.rollingAverageLegend}
        </i>
      </span>
      <p className="text-xs text-muted-foreground">
        {t.dashboard.chartNavigationHint}
      </p>
    </div>
  )
}
