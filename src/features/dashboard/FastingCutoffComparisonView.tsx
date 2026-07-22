import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { DailyEntry } from '@/domain/dailyEntry'
import { kgToLb } from '@/domain/goal'
import { fastingCutoffComparison, lateMealPoints } from '@/domain/stats'
import { formatNumber, unitLabel, useLocale, useTranslation } from '@/i18n'
import { useDashboardChartVisibilityStore, useFastingCutoffStore, useUnitStore } from '@/stores'
import { ChartTitleWithToggle } from './ChartTitleWithToggle'
import { CorrelationStrengthLabel } from './CorrelationStrengthLabel'

export interface FastingCutoffComparisonViewProps {
  entries: DailyEntry[]
}

/**
 * Tests the specific popular claim directly — "stop eating by a certain
 * hour helps weight loss" — with a fixed, user-adjustable cutoff time
 * (Settings' `useFastingCutoffStore`), rather than `LateMealCorrelationView`
 * (#116)/`FastingWindowCorrelationView` (#257)'s relative median splits.
 * A plain 2-bar comparison (before/after the cutoff) rather than a scatter
 * — the underlying last-meal-time-vs-delta points are already the exact
 * scatter `LateMealCorrelationView` renders, so redrawing them here would
 * just duplicate that chart; the two group averages are the genuinely new
 * information this view adds.
 */
export function FastingCutoffComparisonView({
  entries,
}: FastingCutoffComparisonViewProps) {
  const t = useTranslation()
  const locale = useLocale()
  const displayUnit = useUnitStore((state) => state.unit)
  const toDisplay = (kg: number) => (displayUnit === 'lb' ? kgToLb(kg) : kg)
  const unit = unitLabel(displayUnit, t)
  const cutoffTime = useFastingCutoffStore((state) => state.cutoffTime)
  const cardVisible = useDashboardChartVisibilityStore(
    (state) => state.visible.fastingCutoffComparison,
  )

  if (lateMealPoints(entries).length === 0) return null

  const comparison = fastingCutoffComparison(entries, cutoffTime)

  const cardTitle = (
    <ChartTitleWithToggle
      chart="fastingCutoffComparison"
      title={t.dashboard.fastingCutoffTitle}
    />
  )

  if (!cardVisible) {
    return <div className="flex flex-col gap-1.5">{cardTitle}</div>
  }

  if (!comparison) {
    return (
      <div className="flex flex-col gap-1.5">
        {cardTitle}
        <p className="text-sm text-muted-foreground">
          {t.dashboard.fastingCutoffEmptyDescription}
        </p>
      </div>
    )
  }

  const beforeLabel = t.dashboard.fastingCutoffBeforeLabel(cutoffTime)
  const afterLabel = t.dashboard.fastingCutoffAfterLabel(cutoffTime)
  const barData = [
    { label: beforeLabel, delta: toDisplay(comparison.beforeGroupAvgDeltaKg) },
    { label: afterLabel, delta: toDisplay(comparison.afterGroupAvgDeltaKg) },
  ]

  return (
    <div className="flex flex-col gap-1.5">
      {cardTitle}
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={barData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
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
            cursor={{ fill: 'var(--muted)' }}
            contentStyle={{
              background: 'var(--popover)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontSize: 12,
              color: 'var(--popover-foreground)',
            }}
            formatter={(value) => [
              `${formatNumber(Number(value), locale)} ${unit}`,
              t.dashboard.nextDayChangeLegend,
            ]}
          />
          <Bar
            dataKey="delta"
            fill="var(--chart-weight)"
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
      <p className="text-sm text-foreground">
        {t.dashboard.fastingCutoffSummary(
          cutoffTime,
          comparison.afterAveragedMoreGain ? 'after' : 'before',
        )}
      </p>
      <p className="text-xs text-muted-foreground">
        {t.dashboard.fastingCutoffDayCount(comparison.dayCount)}{' '}
        {t.dashboard.fastingCutoffLagCaveat}
      </p>
      <CorrelationStrengthLabel strength={comparison.strength} />
    </div>
  )
}
