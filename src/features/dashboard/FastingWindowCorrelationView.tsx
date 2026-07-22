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
import { fastingWindowCorrelation, fastingWindowPoints } from '@/domain/stats'
import { formatNumber, unitLabel, useLocale, useTranslation } from '@/i18n'
import { useDashboardChartVisibilityStore, useUnitStore } from '@/stores'
import { Button } from '@/shared/ui/button'
import { ChartTitleWithToggle } from './ChartTitleWithToggle'
import { CorrelationStrengthLabel } from './CorrelationStrengthLabel'

export interface FastingWindowCorrelationViewProps {
  entries: DailyEntry[]
}

/**
 * Distinct from `LateMealCorrelationView` (#116, a raw clock time): this
 * pairs each day pair's *actual elapsed fasting duration* — the previous
 * day's last meal to the current day's first meal — with the day-over-day
 * weight change (#257). Same collapsed-until-there's-an-insight pattern
 * as #89/#116.
 */
export function FastingWindowCorrelationView({
  entries,
}: FastingWindowCorrelationViewProps) {
  const t = useTranslation()
  const locale = useLocale()
  const displayUnit = useUnitStore((state) => state.unit)
  const toDisplay = (kg: number) => (displayUnit === 'lb' ? kgToLb(kg) : kg)
  const unit = unitLabel(displayUnit, t)
  const [isExpanded, setIsExpanded] = useState(false)
  const cardVisible = useDashboardChartVisibilityStore(
    (state) => state.visible.fastingWindowCorrelation,
  )

  const points = fastingWindowPoints(entries).map((point) => ({
    fastingHours: point.fastingHours,
    delta: toDisplay(point.deltaKg),
  }))

  if (points.length === 0) return null

  const insight = fastingWindowCorrelation(entries)
  const expanded = insight !== null || isExpanded

  const cardTitle = (
    <ChartTitleWithToggle
      chart="fastingWindowCorrelation"
      title={t.dashboard.fastingWindowTitle}
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
              dataKey="fastingHours"
              name={t.dashboard.fastingHoursLegend}
              tickFormatter={(hours: number) => `${formatNumber(hours, locale, 0)}h`}
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
                name === t.dashboard.fastingHoursLegend
                  ? `${formatNumber(Number(value), locale)}h`
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
            {t.dashboard.fastingWindowSummary(
              `${formatNumber(insight.thresholdHours, locale)}h`,
              insight.shorterAveragedMoreGain ? 'shorter' : 'longer',
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            {t.dashboard.fastingWindowDayCount(insight.dayCount)}{' '}
            {t.dashboard.fastingWindowLagCaveat}
          </p>
          <CorrelationStrengthLabel strength={insight.strength} />
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          {t.dashboard.fastingWindowEmptyDescription}
        </p>
      )}
    </div>
  )
}
