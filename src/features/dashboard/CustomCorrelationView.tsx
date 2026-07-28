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
import type {
  CustomCorrelation,
  CustomMetric,
  CustomMetricEntry,
} from '@/domain/customMetric'
import type { DailyEntry } from '@/domain/dailyEntry'
import {
  customCorrelationFromPoints,
  customCorrelationPoints,
} from '@/domain/stats'
import { formatNumber, getDateFnsLocale, useLocale, useTranslation } from '@/i18n'
import { metricRefLabel } from '@/shared/lib/metricRefLabel'
import { useOutlierExclusion } from '@/shared/hooks'
import { Button } from '@/shared/ui/button'
import { CorrelationStrengthLabel } from './CorrelationStrengthLabel'
import { OutlierPointsList } from './OutlierPointsList'
import { renderOutlierScatterShape } from './outlierScatterShape'

export interface CustomCorrelationViewProps {
  correlation: CustomCorrelation
  entries: DailyEntry[]
  metrics: CustomMetric[]
  metricEntries: CustomMetricEntry[]
}

/**
 * Renders one user-defined `CustomCorrelation` (#336) as a Dashboard card —
 * same collapsed-until-there's-an-insight pattern #89/#116 already
 * established for the fixed built-in views (`MealFrequencyCorrelationView`
 * etc.), reused via the generic same-day pairing/median-split engine
 * (`domain/stats/customCorrelationEngine.ts`) instead of one hardcoded
 * metric-vs-weight-delta shape. A `rounded-lg border` wraps the whole card
 * (unlike the fixed views, which render bare) — this is a brand-new
 * component rendered as an open-ended, variable-length list, so it gets a
 * clear boundary from the start rather than only after the fact (see
 * #354, filed live against the existing borderless views).
 *
 * Deliberately out of scope for v1 (documented, not silently skipped):
 * this list doesn't hook into `dashboardChartVisibilityStore`/
 * `dashboardSectionOrderStore` — those are keyed by a fixed, known set of
 * `DashboardChartKey`s, and retrofitting them for an unbounded
 * user-defined list was judged a bigger structural change than this
 * issue's own core ask. Deleting a correlation (`CustomMetricsScreen.tsx`)
 * is this version's only "hide" mechanism.
 */
export function CustomCorrelationView({
  correlation,
  entries,
  metrics,
  metricEntries,
}: CustomCorrelationViewProps) {
  const t = useTranslation()
  const locale = useLocale()
  const dateFnsLocale = getDateFnsLocale(locale)
  const [isExpanded, setIsExpanded] = useState(false)

  const aLabel = metricRefLabel(t, correlation.metricA, metrics)
  const bLabel = metricRefLabel(t, correlation.metricB, metrics)
  const displayName = correlation.name || `${aLabel} vs. ${bLabel}`

  const rawPoints = customCorrelationPoints(
    correlation.metricA,
    correlation.metricB,
    entries,
    metricEntries,
  )
  const { flags, isExcluded, toggle, includedPoints } = useOutlierExclusion(
    `custom:${correlation.id}`,
    rawPoints,
    (p) => p.aValue,
    (p) => p.bValue,
    (p) => p.date,
  )

  if (rawPoints.length === 0) return null

  const points = rawPoints.map((point, i) => ({
    aValue: point.aValue,
    bValue: point.bValue,
    isOutlier: flags[i],
    isExcluded: isExcluded(point),
  }))
  const outlierPoints = rawPoints.filter((_, i) => flags[i])

  const insight = customCorrelationFromPoints(includedPoints)
  const expanded = insight !== null || isExpanded

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-foreground">{displayName}</h3>
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
              dataKey="aValue"
              name={aLabel}
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              axisLine={{ stroke: 'var(--border)' }}
              tickLine={false}
            />
            <YAxis
              type="number"
              dataKey="bValue"
              name={bLabel}
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
              formatter={(value, name) => [formatNumber(Number(value), locale), name]}
            />
            <Scatter
              data={points}
              fill="var(--chart-1)"
              isAnimationActive={false}
              shape={renderOutlierScatterShape('var(--chart-1)')}
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
          getDate={(point) => point.date}
          formatLabel={(point) =>
            format(parseISO(point.date), 'd MMM yyyy', {
              locale: dateFnsLocale,
            })
          }
        />
      )}
      {insight ? (
        <>
          <p className="text-sm text-foreground">
            {t.dashboard.customCorrelationSummary(
              aLabel,
              formatNumber(insight.thresholdAValue, locale),
              insight.upperAveragedMoreB ? 'higher' : 'lower',
              bLabel,
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            {t.dashboard.customCorrelationDayCount(insight.dayCount)}{' '}
            {t.dashboard.customCorrelationLagCaveat}
          </p>
          <CorrelationStrengthLabel strength={insight.strength} />
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          {t.dashboard.customCorrelationEmptyDescription}
        </p>
      )}
    </div>
  )
}
