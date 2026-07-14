import { format, parseISO } from 'date-fns'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type DotItemDotProps,
} from 'recharts'
import { useNavigate } from 'react-router-dom'
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
import { resolveChartClickDate, type ChartClickState } from './chartNavigation'

export interface WeightTrendChartProps {
  entries: DailyEntry[]
}

export function WeightTrendChart({ entries }: WeightTrendChartProps) {
  const t = useTranslation()
  const locale = useLocale()
  const dateFnsLocale = getDateFnsLocale(locale)
  const navigate = useNavigate()
  const displayUnit = useUnitStore((state) => state.unit)
  const toDisplay = (kg: number) => (displayUnit === 'lb' ? kgToLb(kg) : kg)

  function handleChartClick(state: ChartClickState) {
    const date = resolveChartClickDate(state, 'weight')
    if (date) navigate(`/history?date=${date}`)
  }

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

  return (
    <div className="flex flex-col gap-1.5">
      <ResponsiveContainer width="100%" height={180}>
        <LineChart
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          onClick={handleChartClick}
          className="cursor-pointer"
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
            formatter={(value) => [
              `${formatNumber(Number(value), locale)} ${unit}`,
              t.dashboard.weightLegend,
            ]}
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
