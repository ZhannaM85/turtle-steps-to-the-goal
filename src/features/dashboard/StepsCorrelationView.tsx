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
  outlierBounds,
  stepsCorrelationFromPoints,
  stepsPoints,
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
import { CorrelationChartTooltip } from './CorrelationChartTooltip'
import { CorrelationStrengthLabel } from './CorrelationStrengthLabel'
import { dayNotesByDate } from './dayNotePreview'
import { OutlierPointsList } from './OutlierPointsList'
import { outlierReasonLabel } from './outlierReasonLabel'
import { renderOutlierScatterShape } from './outlierScatterShape'
import { usePeriodFilteredEntries } from './useDashboardChartPeriod'

export interface StepsCorrelationViewProps {
  /** #536/#537 — full entry set; this card filters by its own stored period. */
  entries: DailyEntry[]
  /** #355 — see `CorrelationViewProps.dragHandle`'s own doc comment. */
  dragHandle?: ReactNode
}

/**
 * Extends the day-pairing correlation pattern (#167) `LateMealCorrelationView`
 * established for #116 — same shape, this time pairing each day's logged
 * step count with the *next* calendar day's weight change. Same
 * collapsed-until-there's-an-insight behavior as #89/#116.
 */
export function StepsCorrelationView({
  entries: allEntries,
  dragHandle,
}: StepsCorrelationViewProps) {
  const entries = usePeriodFilteredEntries('stepsCorrelation', allEntries)
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
  const notesByDate = dayNotesByDate(entries)
  const { flags, axes, isExcluded, toggle, includedPoints } = useOutlierExclusion(
    'steps',
    rawPoints,
    (p) => p.steps,
    (p) => p.deltaKg,
    (p) => p.date,
  )

  if (rawPoints.length === 0) return null

  const metricLabel = t.dashboard.stepsCountLegend
  const points = rawPoints.map((point, i) => ({
    date: point.date,
    steps: point.steps,
    delta: toDisplay(point.deltaKg),
    isOutlier: flags[i],
    isExcluded: isExcluded(point),
    outlierReason: flags[i]
      ? outlierReasonLabel(t.dashboard, axes[i], metricLabel)
      : undefined,
    dayNotePreview: notesByDate.get(point.date),
  }))
  const outlierPoints = rawPoints.filter((_, i) => flags[i])
  const reasonByKey = new Map(
    rawPoints.flatMap((point, i) =>
      flags[i]
        ? [
            [
              point.date,
              outlierReasonLabel(t.dashboard, axes[i], metricLabel),
            ] as const,
          ]
        : [],
    ),
  )

  // #375 — reported live: a handful of extreme step counts (e.g. a
  // double-counted day from a multi-source import) stretched the x-axis
  // so wide that the normal <15,000-step cluster squished together
  // unreadably. Reuses the same Tukey's-fences bounds already computing
  // which points render red/get listed below (#224) — an extreme point
  // still renders (Recharts clips it at the visible edge via
  // allowDataOverflow, not delete it), it just no longer dictates the
  // whole axis's scale. Falls back to Recharts' own 'auto' domain exactly
  // as before when there's too little data for the bounds to mean
  // anything (fewer than 4 points).
  const stepsBounds = outlierBounds(rawPoints.map((p) => p.steps))
  const xDomain: [number, number | 'auto'] = stepsBounds
    ? [0, stepsBounds.upper]
    : [0, 'auto']

  const insight = stepsCorrelationFromPoints(includedPoints)
  const expanded = insight !== null || isExpanded

  const cardTitle = (
    <ChartTitleWithToggle
      chart="stepsCorrelation"
      title={t.dashboard.stepsCorrelationTitle}
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
              dataKey="steps"
              name={t.dashboard.stepsCountLegend}
              domain={xDomain}
              allowDataOverflow
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
              wrapperStyle={{ pointerEvents: 'auto' }}
              content={
                <CorrelationChartTooltip
                  formatValue={(value, name) =>
                    name === t.dashboard.stepsCountLegend
                      ? formatNumber(value, locale, 0)
                      : `${formatNumber(value, locale)} ${unit}`
                  }
                />
              }
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
          getDate={(point) => point.date}
          formatLabel={(point) =>
            format(parseISO(point.date), 'd MMM yyyy', {
              locale: dateFnsLocale,
            })
          }
          formatReason={(point) => reasonByKey.get(point.date)}
          formatNotePreview={(point) => notesByDate.get(point.date)}
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
