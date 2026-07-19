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
import { stepsCorrelation, stepsPoints } from '@/domain/stats'
import { formatNumber, unitLabel, useLocale, useTranslation } from '@/i18n'
import { useUnitStore } from '@/stores'
import { Button } from '@/shared/ui/button'

export interface StepsCorrelationViewProps {
  entries: DailyEntry[]
}

/**
 * Extends the day-pairing correlation pattern (#167) `LateMealCorrelationView`
 * established for #116 — same shape, this time pairing each day's logged
 * step count with the *next* calendar day's weight change. Same
 * collapsed-until-there's-an-insight behavior as #89/#116.
 */
export function StepsCorrelationView({ entries }: StepsCorrelationViewProps) {
  const t = useTranslation()
  const locale = useLocale()
  const displayUnit = useUnitStore((state) => state.unit)
  const toDisplay = (kg: number) => (displayUnit === 'lb' ? kgToLb(kg) : kg)
  const unit = unitLabel(displayUnit, t)
  const [isExpanded, setIsExpanded] = useState(false)

  const points = stepsPoints(entries).map((point) => ({
    steps: point.steps,
    delta: toDisplay(point.deltaKg),
  }))

  if (points.length === 0) return null

  const insight = stepsCorrelation(entries)
  const expanded = insight !== null || isExpanded

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">
          {t.dashboard.stepsCorrelationTitle}
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
              dataKey="steps"
              name={t.dashboard.stepsCountLegend}
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
                name === t.dashboard.stepsCountLegend
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
            {t.dashboard.stepsCorrelationSummary(
              formatNumber(insight.thresholdSteps, locale, 0),
              insight.fewerAveragedMoreGain ? 'fewer' : 'more',
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            {t.dashboard.stepsCorrelationDayCount(insight.dayCount)}{' '}
            {t.dashboard.stepsCorrelationLagCaveat}
          </p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          {t.dashboard.stepsCorrelationEmptyDescription}
        </p>
      )}
    </div>
  )
}
