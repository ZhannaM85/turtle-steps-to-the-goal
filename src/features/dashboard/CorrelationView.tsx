import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { DailyEntry } from '@/domain/dailyEntry'
import { kgToLb, type Goal } from '@/domain/goal'
import { correlationInsight, weeklySummaries } from '@/domain/stats'
import { formatNumber, unitLabel, useLocale, useTranslation } from '@/i18n'

export interface CorrelationViewProps {
  entries: DailyEntry[]
  goal: Goal | null
}

export function CorrelationView({ entries, goal }: CorrelationViewProps) {
  const t = useTranslation()
  const locale = useLocale()
  const displayUnit = goal?.displayUnit ?? 'kg'
  const toDisplay = (kg: number) => (displayUnit === 'lb' ? kgToLb(kg) : kg)
  const unit = unitLabel(displayUnit, t)

  const weeks = weeklySummaries(entries)
  const points = weeks
    .filter(
      (
        week,
      ): week is typeof week & {
        averageCalories: number
        deltaVsPriorWeekKg: number
      } => week.averageCalories !== null && week.deltaVsPriorWeekKg !== null,
    )
    .map((week) => ({
      calories: week.averageCalories,
      delta: toDisplay(week.deltaVsPriorWeekKg),
    }))

  if (points.length === 0) return null

  const insight = correlationInsight(entries)

  return (
    <div className="flex flex-col gap-1.5">
      <h2 className="text-sm font-medium text-muted-foreground">
        {t.dashboard.correlationTitle}
      </h2>
      <ResponsiveContainer width="100%" height={180}>
        <ScatterChart margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            type="number"
            dataKey="calories"
            name={t.dashboard.caloriesLegend}
            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
            axisLine={{ stroke: 'var(--border)' }}
            tickLine={false}
          />
          <YAxis
            type="number"
            dataKey="delta"
            name={t.dashboard.weeklyChangeLegend}
            width={40}
            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ strokeDasharray: '3 3', stroke: 'var(--border)' }}
            contentStyle={{
              background: 'var(--popover)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontSize: 12,
              color: 'var(--popover-foreground)',
            }}
            formatter={(value, name) => [
              name === t.dashboard.caloriesLegend
                ? formatNumber(Number(value), locale, 0)
                : `${formatNumber(Number(value), locale)} ${unit}`,
              name,
            ]}
          />
          <Scatter data={points} fill="var(--chart-weight)" />
        </ScatterChart>
      </ResponsiveContainer>
      {insight ? (
        <>
          <p className="text-sm text-foreground">
            {t.dashboard.correlationSummary(
              insight.thresholdKcal,
              insight.lowerAveragedMoreLoss ? 'lower' : 'higher',
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            {t.dashboard.correlationWeekCount(insight.weekCount)}{' '}
            {t.dashboard.correlationLagCaveat}
          </p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          {t.dashboard.correlationEmptyDescription}
        </p>
      )}
    </div>
  )
}
