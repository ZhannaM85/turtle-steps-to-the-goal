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
  calorieDayCorrelationFromPoints,
  calorieDayPoints,
  outlierBounds,
  scatterDomainFromValues,
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
import {
  CORRELATION_SCATTER_TOOLTIP_TRIGGER,
  CORRELATION_SCATTER_TOOLTIP_WRAPPER_STYLE,
} from './correlationScatterTooltip'
import { CorrelationStrengthLabel } from './CorrelationStrengthLabel'
import { EmptyDashboardSection } from './EmptyDashboardSection'
import {
  CORRELATION_SCATTER_Y_AXIS_WIDTH,
  formatCorrelationScatterTick,
} from './correlationScatterAxis'
import { dayNotesByDate } from './dayNotePreview'
import { OutlierPointsList } from './OutlierPointsList'
import { outlierReasonLabel } from './outlierReasonLabel'
import { renderOutlierScatterShape } from './outlierScatterShape'
import {
  usePeriodFilteredEntries,
  useDashboardChartPeriod,
} from './useDashboardChartPeriod'
import { ZoomableScatterSurface } from './ZoomableScatterSurface'

export interface CorrelationViewProps {
  /** #536/#537 — full entry set; this card filters by its own stored period. */
  entries: DailyEntry[]
  /** #355 — Dashboard's reorder-mode drag handle, forwarded into this
   * section's own `ChartTitleWithToggle` call so it renders beside the
   * title instead of `SortableDashboardSection` stacking it above the
   * whole section. */
  dragHandle?: ReactNode
}

/**
 * #710 — day-pair calories vs next-day weight (same shape as
 * `StepsCorrelationView`), replacing the weekly-average card that lived
 * here through #7/#216/#522. Same Dashboard slot (`calorieWeightCorrelation`).
 */
export function CorrelationView({
  entries: allEntries,
  dragHandle,
}: CorrelationViewProps) {
  const entries = usePeriodFilteredEntries(
    'calorieWeightCorrelation',
    allEntries,
  )
  const { period, customStart, customEnd } = useDashboardChartPeriod(
    'calorieWeightCorrelation',
  )
  const gestureResetKey = `${period}|${customStart}|${customEnd}`
  const t = useTranslation()
  const locale = useLocale()
  const dateFnsLocale = getDateFnsLocale(locale)
  const displayUnit = useUnitStore((state) => state.unit)
  const toDisplay = (kg: number) => (displayUnit === 'lb' ? kgToLb(kg) : kg)
  const unit = unitLabel(displayUnit, t)
  const [isExpanded, setIsExpanded] = useState(false)
  const cardVisible = useDashboardChartVisibilityStore(
    (state) => state.visible.calorieWeightCorrelation,
  )

  const rawPoints = calorieDayPoints(entries)
  const notesByDate = dayNotesByDate(entries)
  const { flags, axes, isExcluded, toggle, includedPoints } =
    useOutlierExclusion(
      'calorieWeight',
      rawPoints,
      (p) => p.calories,
      (p) => p.deltaKg,
      (p) => p.date,
    )

  if (rawPoints.length === 0) {
    return (
      <EmptyDashboardSection
        chart="calorieWeightCorrelation"
        title={t.dashboard.correlationTitle}
        description={t.dashboard.correlationEmptyDescription}
        dragHandle={dragHandle}
        visible={cardVisible}
      />
    )
  }

  const metricLabel = t.dashboard.caloriesLegend
  const points = rawPoints.map((point, i) => ({
    date: point.date,
    calories: point.calories,
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

  const calorieBounds = outlierBounds(rawPoints.map((p) => p.calories))
  const xValues = points.map((p) => p.calories)
  const yValues = points.map((p) => p.delta)
  const baseDomain = scatterDomainFromValues(xValues, yValues)
  const fullDomainOverride =
    calorieBounds && baseDomain
      ? {
          xMin: 0,
          xMax: calorieBounds.upper,
          yMin: baseDomain.yMin,
          yMax: baseDomain.yMax,
        }
      : baseDomain

  const insight = calorieDayCorrelationFromPoints(includedPoints)
  const expanded = insight !== null || isExpanded

  const cardTitle = (
    <ChartTitleWithToggle
      chart="calorieWeightCorrelation"
      title={t.dashboard.correlationTitle}
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
    return (
      <div className="flex flex-col gap-1.5 rounded-lg border border-border p-3">
        {cardTitle}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border p-3">
      {cardTitle}
      {expanded && (
        <ZoomableScatterSurface
          resetKey={gestureResetKey}
          xValues={xValues}
          yValues={yValues}
          fullDomainOverride={fullDomainOverride}
        >
          {({ xDomain, yDomain, isGesturing }) => (
            <ResponsiveContainer width="100%" height={180}>
              <ScatterChart margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  type="number"
                  dataKey="calories"
                  name={t.dashboard.caloriesLegend}
                  domain={xDomain}
                  allowDataOverflow
                  tickFormatter={(value: number) =>
                    formatCorrelationScatterTick(value, locale)
                  }
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                  axisLine={{ stroke: 'var(--border)' }}
                  tickLine={false}
                />
                <YAxis
                  type="number"
                  dataKey="delta"
                  name={t.dashboard.nextDayChangeLegend}
                  domain={yDomain}
                  allowDataOverflow
                  width={CORRELATION_SCATTER_Y_AXIS_WIDTH}
                  tickFormatter={(value: number) =>
                    formatCorrelationScatterTick(value, locale)
                  }
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  trigger={CORRELATION_SCATTER_TOOLTIP_TRIGGER}
                  active={isGesturing ? false : undefined}
                  cursor={{ strokeDasharray: '3 3', stroke: 'var(--border)' }}
                  wrapperStyle={CORRELATION_SCATTER_TOOLTIP_WRAPPER_STYLE}
                  content={
                    <CorrelationChartTooltip
                      formatValue={(value, name) =>
                        name === t.dashboard.caloriesLegend
                          ? `${formatNumber(value, locale, 0)} ${t.dailyEntry.kcalUnit}`
                          : `${formatNumber(value, locale)} ${unit}`
                      }
                    />
                  }
                />
                <Scatter
                  data={points}
                  fill="var(--chart-calories)"
                  isAnimationActive={false}
                  shape={renderOutlierScatterShape('var(--chart-calories)')}
                />
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </ZoomableScatterSurface>
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
            {t.dashboard.correlationSummary(
              formatNumber(insight.thresholdKcal, locale, 0),
              insight.lowerAveragedMoreGain ? 'lower' : 'higher',
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            {t.dashboard.correlationDayCount(insight.dayCount)}{' '}
            {t.dashboard.correlationLagCaveat}
          </p>
          <CorrelationStrengthLabel strength={insight.strength} />
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          {t.dashboard.correlationEmptyDescription}
        </p>
      )}
    </div>
  )
}
