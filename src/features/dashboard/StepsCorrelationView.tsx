import { useState } from 'react'
import { format, parseISO } from 'date-fns'
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
import { stepsCorrelationFromPoints, stepsPoints } from '@/domain/stats'
import {
  formatNumber,
  getDateFnsLocale,
  unitLabel,
  useLocale,
  useTranslation,
} from '@/i18n'
import { useDashboardChartVisibilityStore, useUnitStore } from '@/stores'
import { useOutlierExclusion } from '@/shared/hooks'
import { Button } from '@/shared/ui/button'
import { ChartTitleWithToggle } from './ChartTitleWithToggle'
import { CorrelationStrengthLabel } from './CorrelationStrengthLabel'
import { OutlierPointsList } from './OutlierPointsList'
import { renderOutlierScatterShape } from './outlierScatterShape'

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
  const dateFnsLocale = getDateFnsLocale(locale)
  const displayUnit = useUnitStore((state) => state.unit)
  const toDisplay = (kg: number) => (displayUnit === 'lb' ? kgToLb(kg) : kg)
  const unit = unitLabel(displayUnit, t)
  const [isExpanded, setIsExpanded] = useState(false)
  const cardVisible = useDashboardChartVisibilityStore(
    (state) => state.visible.stepsCorrelation,
  )

  const rawPoints = stepsPoints(entries)
  const { flags, isExcluded, toggle, includedPoints } = useOutlierExclusion(
    'steps',
    rawPoints,
    (p) => p.steps,
    (p) => p.deltaKg,
    (p) => p.date,
  )

  if (rawPoints.length === 0) return null

  const points = rawPoints.map((point, i) => ({
    steps: point.steps,
    delta: toDisplay(point.deltaKg),
    isOutlier: flags[i],
    isExcluded: isExcluded(point),
  }))
  const outlierPoints = rawPoints.filter((_, i) => flags[i])

  const insight = stepsCorrelationFromPoints(includedPoints)
  const expanded = insight !== null || isExpanded

  const cardTitle = (
    <ChartTitleWithToggle
      chart="stepsCorrelation"
      title={t.dashboard.stepsCorrelationTitle}
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
              shape={renderOutlierScatterShape('var(--chart-weight)')}
            />
          </ScatterChart>
        </ResponsiveContainer>
      )}
      {expanded && (
        <OutlierPointsList
          points={outlierPoints}
          isExcluded={isExcluded}
          onToggle={toggle}
          getKey={(point) => point.date}
          formatLabel={(point) =>
            format(parseISO(point.date), 'd MMM', { locale: dateFnsLocale })
          }
        />
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
          <CorrelationStrengthLabel strength={insight.strength} />
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          {t.dashboard.stepsCorrelationEmptyDescription}
        </p>
      )}
    </div>
  )
}
