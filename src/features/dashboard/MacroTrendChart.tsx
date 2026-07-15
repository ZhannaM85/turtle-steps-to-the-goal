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
  type TooltipContentProps,
} from 'recharts'
import { Link } from 'react-router-dom'
import {
  totalCarbs,
  totalFat,
  totalProtein,
  type DailyEntry,
} from '@/domain/dailyEntry'
import {
  formatNumber,
  getDateFnsLocale,
  useLocale,
  useTranslation,
} from '@/i18n'
import { resolveChartClickDate } from './chartNavigation'

interface MacroPoint {
  date: string
  proteinG?: number
  fatG?: number
  carbsG?: number
}

export interface MacroTrendChartProps {
  entries: DailyEntry[]
}

/**
 * One combined chart with three lines, rather than three separate small
 * charts (#53) — protein/fat/carbs share the same unit (grams) and are
 * comparable in scale, and this keeps the Dashboard from growing three more
 * full-width charts on top of weight/calories/correlation.
 */
export function MacroTrendChart({ entries }: MacroTrendChartProps) {
  const t = useTranslation()
  const locale = useLocale()
  const dateFnsLocale = getDateFnsLocale(locale)

  const data: MacroPoint[] = entries
    .map((entry) => ({
      date: entry.date,
      proteinG: totalProtein(entry.calorieEntries),
      fatG: totalFat(entry.calorieEntries),
      carbsG: totalCarbs(entry.calorieEntries),
    }))
    .filter(
      (point) =>
        point.proteinG !== undefined ||
        point.fatG !== undefined ||
        point.carbsG !== undefined,
    )
    .sort((a, b) => a.date.localeCompare(b.date))

  if (data.length === 0) return null

  function renderTooltip({ active, label, payload }: TooltipContentProps) {
    if (!active || !payload || payload.length === 0) return null
    const date = resolveChartClickDate(
      { activeLabel: label },
      data,
      (point) =>
        point.proteinG !== undefined ||
        point.fatG !== undefined ||
        point.carbsG !== undefined,
    )
    const legendFor = (dataKey: string) =>
      dataKey === 'proteinG'
        ? t.dailyEntry.proteinLabel
        : dataKey === 'fatG'
          ? t.dailyEntry.fatLabel
          : t.dailyEntry.carbsLabel
    return (
      <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
        <p className="mb-1 font-medium">
          {format(parseISO(String(label)), 'PP', { locale: dateFnsLocale })}
        </p>
        {payload.map((item) => (
          <p key={String(item.dataKey)}>
            {formatNumber(Number(item.value), locale, 0)}
            {t.dailyEntry.gramsUnit} · {legendFor(String(item.dataKey))}
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
      <h2 className="text-sm font-medium text-muted-foreground">
        {t.dashboard.macrosTitle}
      </h2>
      <ResponsiveContainer width="100%" height={160}>
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
          />
          <Tooltip
            content={renderTooltip}
            wrapperStyle={{ pointerEvents: 'auto' }}
          />
          <Line
            type="monotone"
            dataKey="proteinG"
            stroke="var(--chart-protein)"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="fatG"
            stroke="var(--chart-fat)"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="carbsG"
            stroke="var(--chart-carbs)"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <span className="flex gap-3 text-xs text-muted-foreground">
        <i className="flex items-center gap-1 not-italic">
          <span
            aria-hidden="true"
            className="size-2 rounded-sm"
            style={{ background: 'var(--chart-protein)' }}
          />
          {t.dailyEntry.proteinLabel}
        </i>
        <i className="flex items-center gap-1 not-italic">
          <span
            aria-hidden="true"
            className="size-2 rounded-sm"
            style={{ background: 'var(--chart-fat)' }}
          />
          {t.dailyEntry.fatLabel}
        </i>
        <i className="flex items-center gap-1 not-italic">
          <span
            aria-hidden="true"
            className="size-2 rounded-sm"
            style={{ background: 'var(--chart-carbs)' }}
          />
          {t.dailyEntry.carbsLabel}
        </i>
      </span>
      <p className="text-xs text-muted-foreground">
        {t.dashboard.chartNavigationHint}
      </p>
    </div>
  )
}
