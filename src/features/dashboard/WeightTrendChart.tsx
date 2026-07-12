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
import type { DailyEntry } from '@/domain/dailyEntry'
import { kgToLb, type Goal } from '@/domain/goal'
import { projectedPaceTrajectory } from '@/domain/stats'
import {
  formatNumber,
  getDateFnsLocale,
  unitLabel,
  useLocale,
  useTranslation,
} from '@/i18n'

interface ChartPoint {
  date: string
  weight?: number
  projection?: number
}

export interface WeightTrendChartProps {
  entries: DailyEntry[]
  goal: Goal | null
}

export function WeightTrendChart({ entries, goal }: WeightTrendChartProps) {
  const t = useTranslation()
  const locale = useLocale()
  const dateFnsLocale = getDateFnsLocale(locale)
  const displayUnit = goal?.displayUnit ?? 'kg'
  const toDisplay = (kg: number) => (displayUnit === 'lb' ? kgToLb(kg) : kg)

  const weightPoints = entries
    .filter(
      (entry): entry is DailyEntry & { weightKg: number } =>
        entry.weightKg !== undefined,
    )
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((entry) => ({ date: entry.date, weight: toDisplay(entry.weightKg) }))

  const trajectory = projectedPaceTrajectory(entries, goal).map((point) => ({
    date: point.date,
    projection: toDisplay(point.weightKg),
  }))

  if (weightPoints.length === 0) return null

  const merged = new Map<string, ChartPoint>()
  for (const point of weightPoints) {
    merged.set(point.date, { ...merged.get(point.date), ...point })
  }
  for (const point of trajectory) {
    merged.set(point.date, { ...merged.get(point.date), ...point })
  }
  const data = [...merged.values()].sort((a, b) => a.date.localeCompare(b.date))
  const lastWeightDate = weightPoints[weightPoints.length - 1].date
  const lastWeightIndex = data.findIndex((p) => p.date === lastWeightDate)

  const unit = unitLabel(displayUnit, t)

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
          />
          <Line
            type="monotone"
            dataKey="projection"
            stroke="var(--muted-foreground)"
            strokeOpacity={0.8}
            strokeWidth={1.5}
            strokeDasharray="4 4"
            connectNulls={false}
            dot={false}
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
        {trajectory.length > 0 && (
          <i className="flex items-center gap-1 not-italic">
            <span
              aria-hidden="true"
              className="size-2 rounded-sm border border-dashed border-muted-foreground"
            />
            {t.dashboard.projectionLegend}
          </i>
        )}
      </span>
    </div>
  )
}
