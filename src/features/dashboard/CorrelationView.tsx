import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
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
import { kgToLb } from '@/domain/goal'
import { correlationInsight, weeklySummaries } from '@/domain/stats'
import { formatNumber, unitLabel, useLocale, useTranslation } from '@/i18n'
import { useUnitStore } from '@/stores'
import { useWeekStartsOn } from '@/shared/hooks'
import { Button } from '@/shared/ui/button'

export interface CorrelationViewProps {
  entries: DailyEntry[]
}

export function CorrelationView({ entries }: CorrelationViewProps) {
  const t = useTranslation()
  const locale = useLocale()
  const displayUnit = useUnitStore((state) => state.unit)
  const toDisplay = (kg: number) => (displayUnit === 'lb' ? kgToLb(kg) : kg)
  const unit = unitLabel(displayUnit, t)
  // The plot itself is collapsed by default until there's an actual
  // insight to show (#89) — with under MIN_COMPARABLE_WEEKS worth of data
  // it's just a near-empty scatter for the first several weeks of use,
  // which read as broken rather than "come back later". The caveat text
  // explaining that stays visible either way; only the chart is opt-in.
  // Once real data exists, the chart renders expanded by default — no
  // toggle shown, since there's now something worth seeing at a glance.
  const [isExpanded, setIsExpanded] = useState(false)

  const weekStartsOn = useWeekStartsOn(entries)
  const weeks = weeklySummaries(entries, undefined, weekStartsOn)
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

  const insight = correlationInsight(entries, weekStartsOn)
  const expanded = insight !== null || isExpanded

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">
          {t.dashboard.correlationTitle}
        </h2>
        {insight === null && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-expanded={isExpanded}
            onClick={() => setIsExpanded((prev) => !prev)}
          >
            {isExpanded
              ? t.dashboard.correlationCollapseLabel
              : t.dashboard.correlationExpandLabel}
            {isExpanded ? (
              <ChevronUp aria-hidden="true" />
            ) : (
              <ChevronDown aria-hidden="true" />
            )}
          </Button>
        )}
      </div>
      {expanded && (
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
            <Scatter
              data={points}
              fill="var(--chart-weight)"
              isAnimationActive={false}
            />
          </ScatterChart>
        </ResponsiveContainer>
      )}
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
