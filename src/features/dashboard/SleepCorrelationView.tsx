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
import { sleepCorrelation, sleepPoints } from '@/domain/stats'
import { formatNumber, unitLabel, useLocale, useTranslation } from '@/i18n'
import { useDashboardChartVisibilityStore, useUnitStore } from '@/stores'
import { Button } from '@/shared/ui/button'
import { ChartTitleWithToggle } from './ChartTitleWithToggle'
import { CorrelationStrengthLabel } from './CorrelationStrengthLabel'

export interface SleepCorrelationViewProps {
  entries: DailyEntry[]
}

/**
 * Extends the day-pairing correlation pattern (#167) `LateMealCorrelationView`
 * established for #116 — same shape, this time pairing each day's logged
 * sleep hours with the *next* calendar day's weight change instead of last
 * meal time. Same collapsed-until-there's-an-insight behavior as #89/#116.
 */
export function SleepCorrelationView({ entries }: SleepCorrelationViewProps) {
  const t = useTranslation()
  const locale = useLocale()
  const displayUnit = useUnitStore((state) => state.unit)
  const toDisplay = (kg: number) => (displayUnit === 'lb' ? kgToLb(kg) : kg)
  const unit = unitLabel(displayUnit, t)
  const [isExpanded, setIsExpanded] = useState(false)
  const cardVisible = useDashboardChartVisibilityStore(
    (state) => state.visible.sleepCorrelation,
  )

  const points = sleepPoints(entries).map((point) => ({
    hours: point.hours,
    delta: toDisplay(point.deltaKg),
  }))

  if (points.length === 0) return null

  const insight = sleepCorrelation(entries)
  const expanded = insight !== null || isExpanded

  const cardTitle = (
    <ChartTitleWithToggle
      chart="sleepCorrelation"
      title={t.dashboard.sleepCorrelationTitle}
      extraAction={
        insight === null && (
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
        )
      }
    />
  )

  if (!cardVisible) {
    return <div className="flex flex-col gap-1.5">{cardTitle}</div>
  }

  return (
    <div className="flex flex-col gap-1.5">
      {cardTitle}
      {expanded && (
        <ResponsiveContainer width="100%" height={180}>
          <ScatterChart margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              type="number"
              dataKey="hours"
              name={t.dashboard.sleepHoursLegend}
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              axisLine={{ stroke: 'var(--border)' }}
              tickLine={false}
            />
            <YAxis
              type="number"
              dataKey="delta"
              name={t.dashboard.nextDayChangeLegend}
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
                `${formatNumber(Number(value), locale)}${name === t.dashboard.sleepHoursLegend ? 'h' : ` ${unit}`}`,
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
            {t.dashboard.sleepCorrelationSummary(
              formatNumber(insight.thresholdHours, locale),
              insight.lessAveragedMoreGain ? 'less' : 'more',
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            {t.dashboard.sleepCorrelationDayCount(insight.dayCount)}{' '}
            {t.dashboard.sleepCorrelationLagCaveat}
          </p>
          <CorrelationStrengthLabel strength={insight.strength} />
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          {t.dashboard.sleepCorrelationEmptyDescription}
        </p>
      )}
    </div>
  )
}
