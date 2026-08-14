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
import { sleepCorrelationFromPoints, sleepPoints } from '@/domain/stats'
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
  handleCorrelationScatterChartClick,
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
import { usePeriodFilteredEntries, useDashboardChartPeriod } from './useDashboardChartPeriod'
import { ZoomableScatterSurface } from './ZoomableScatterSurface'

export interface SleepCorrelationViewProps {
  /** #536/#537 — full entry set; this card filters by its own stored period. */
  entries: DailyEntry[]
  /** #355 — see `CorrelationViewProps.dragHandle`'s own doc comment. */
  dragHandle?: ReactNode
}

/**
 * Extends the day-pairing correlation pattern (#167) `LateMealCorrelationView`
 * established for #116 — same shape, this time pairing each day's logged
 * sleep hours with the *next* calendar day's weight change instead of last
 * meal time. Same collapsed-until-there's-an-insight behavior as #89/#116.
 */
export function SleepCorrelationView({
  entries: allEntries,
  dragHandle,
}: SleepCorrelationViewProps) {
  const entries = usePeriodFilteredEntries('sleepCorrelation', allEntries)
  const { period, customStart, customEnd } = useDashboardChartPeriod(
    'sleepCorrelation',
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
    (state) => state.visible.sleepCorrelation,
  )

  const rawPoints = sleepPoints(entries)
  const notesByDate = dayNotesByDate(entries)
  const { flags, axes, isExcluded, toggle, includedPoints } = useOutlierExclusion(
    'sleep',
    rawPoints,
    (p) => p.hours,
    (p) => p.deltaKg,
    (p) => p.date,
  )

  if (rawPoints.length === 0) {
    return (
      <EmptyDashboardSection
        chart="sleepCorrelation"
        title={t.dashboard.sleepCorrelationTitle}
        description={t.dashboard.sleepCorrelationEmptyDescription}
        dragHandle={dragHandle}
        visible={cardVisible}
      />
    )
  }

  const metricLabel = t.dashboard.sleepHoursLegend
  const points = rawPoints.map((point, i) => ({
    date: point.date,
    hours: point.hours,
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

  const insight = sleepCorrelationFromPoints(includedPoints)
  const expanded = insight !== null || isExpanded

  const cardTitle = (
    <ChartTitleWithToggle
      chart="sleepCorrelation"
      title={t.dashboard.sleepCorrelationTitle}
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
    return <div className="flex flex-col gap-1.5 section-shell p-3">{cardTitle}</div>
  }

  return (
    <div className="flex flex-col gap-1.5 section-shell p-3">
      {cardTitle}
      {expanded && (
        <ZoomableScatterSurface
          resetKey={gestureResetKey}
          xValues={points.map((p) => p.hours)}
          yValues={points.map((p) => p.delta)}
        >
          {({
            xDomain,
            yDomain,
            tooltipActive,
            dismissTooltip,
            revealTooltip,
          }) => (
            <ResponsiveContainer width="100%" height={180}>
              <ScatterChart
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                onClick={(state) =>
                  handleCorrelationScatterChartClick(
                    state,
                    dismissTooltip,
                    revealTooltip,
                  )
                }
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  type="number"
                  dataKey="hours"
                  name={t.dashboard.sleepHoursLegend}
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
                  active={tooltipActive}
                  cursor={{ strokeDasharray: '3 3', stroke: 'var(--border)' }}
                  wrapperStyle={CORRELATION_SCATTER_TOOLTIP_WRAPPER_STYLE}
                  content={
                    <CorrelationChartTooltip
                      onClose={dismissTooltip}
                      formatValue={(value, name) =>
                        `${formatNumber(value, locale)}${name === t.dashboard.sleepHoursLegend ? 'h' : ` ${unit}`}`
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
