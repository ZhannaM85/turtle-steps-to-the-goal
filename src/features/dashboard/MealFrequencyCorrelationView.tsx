import { useState, type ReactNode } from 'react'
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
import {
  mealFrequencyCorrelationFromPoints,
  mealFrequencyPoints,
} from '@/domain/stats'
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

export interface MealFrequencyCorrelationViewProps {
  entries: DailyEntry[]
  /** #355 — see `CorrelationViewProps.dragHandle`'s own doc comment. */
  dragHandle?: ReactNode
}

/**
 * Distinct from `LateMealCorrelationView` (meal *timing*) and
 * `ProteinCorrelationView` (meal *composition*): this pairs each day's
 * *number of logged meals* with the *next* calendar day's weight change
 * (#338) — "3 larger meals vs. 5 smaller ones, does the count itself
 * relate to next-day weight?" Same collapsed-until-there's-an-insight
 * pattern as #89/#116.
 */
export function MealFrequencyCorrelationView({
  entries,
  dragHandle,
}: MealFrequencyCorrelationViewProps) {
  const t = useTranslation()
  const locale = useLocale()
  const dateFnsLocale = getDateFnsLocale(locale)
  const displayUnit = useUnitStore((state) => state.unit)
  const toDisplay = (kg: number) => (displayUnit === 'lb' ? kgToLb(kg) : kg)
  const unit = unitLabel(displayUnit, t)
  const [isExpanded, setIsExpanded] = useState(false)
  const cardVisible = useDashboardChartVisibilityStore(
    (state) => state.visible.mealFrequencyCorrelation,
  )

  const rawPoints = mealFrequencyPoints(entries)
  const { flags, isExcluded, toggle, includedPoints } = useOutlierExclusion(
    'mealFrequency',
    rawPoints,
    (p) => p.mealCount,
    (p) => p.deltaKg,
    (p) => p.date,
  )

  if (rawPoints.length === 0) return null

  const points = rawPoints.map((point, i) => ({
    mealCount: point.mealCount,
    delta: toDisplay(point.deltaKg),
    isOutlier: flags[i],
    isExcluded: isExcluded(point),
  }))
  const outlierPoints = rawPoints.filter((_, i) => flags[i])

  const insight = mealFrequencyCorrelationFromPoints(includedPoints)
  const expanded = insight !== null || isExpanded

  const cardTitle = (
    <ChartTitleWithToggle
      chart="mealFrequencyCorrelation"
      title={t.dashboard.mealFrequencyTitle}
      dragHandle={dragHandle}
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
    return <div className="flex flex-col gap-1.5 rounded-lg border border-border p-3">{cardTitle}</div>
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border p-3">
      {cardTitle}
      {expanded && (
        <ResponsiveContainer width="100%" height={180}>
          <ScatterChart margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              type="number"
              dataKey="mealCount"
              name={t.dashboard.mealCountLegend}
              allowDecimals={false}
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
                name === t.dashboard.mealCountLegend
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
            {t.dashboard.mealFrequencySummary(
              insight.thresholdMealCount,
              insight.moreAveragedMoreGain ? 'more' : 'fewer',
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            {t.dashboard.mealFrequencyDayCount(insight.dayCount)}{' '}
            {t.dashboard.mealFrequencyLagCaveat}
          </p>
          <CorrelationStrengthLabel strength={insight.strength} />
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          {t.dashboard.mealFrequencyEmptyDescription}
        </p>
      )}
    </div>
  )
}
