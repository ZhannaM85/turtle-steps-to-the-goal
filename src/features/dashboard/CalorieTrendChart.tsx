import { format, parseISO } from 'date-fns'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { DailyEntry } from '@/domain/dailyEntry'
import { rollingAverage } from '@/domain/stats'
import {
  formatNumber,
  getDateFnsLocale,
  useLocale,
  useTranslation,
} from '@/i18n'

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
    .filter(
      (entry): entry is DailyEntry & { caloriesConsumed: number } =>
        entry.caloriesConsumed !== undefined,
    )
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((entry) => ({ date: entry.date, calories: entry.caloriesConsumed }))

  if (calorieBars.length === 0) return null

  const rolling = rollingAverage(
    entries,
    'caloriesConsumed',
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
            contentStyle={{
              background: 'var(--popover)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontSize: 12,
              color: 'var(--popover-foreground)',
            }}
            labelFormatter={(label) =>
              format(parseISO(String(label)), 'PP', { locale: dateFnsLocale })
            }
            formatter={(value, name) => [
              formatNumber(Number(value), locale, 0),
              name === 'average'
                ? t.dashboard.rollingAverageLegend
                : t.dashboard.caloriesLegend,
            ]}
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
    </div>
  )
}
