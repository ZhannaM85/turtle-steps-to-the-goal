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
  alcoholCorrelationFromPoints,
  alcoholPoints,
  scatterDomainFromValues,
} from '@/domain/stats'
import {
  formatNumber,
  getDateFnsLocale,
  unitLabel,
  useLocale,
  useTranslation,
} from '@/i18n'
import {
  useAlcoholTrackingStore,
  useDashboardChartVisibilityStore,
  useUnitStore,
} from '@/stores'
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
import { usePeriodFilteredEntries, useDashboardChartPeriod } from './useDashboardChartPeriod'
import { ZoomableScatterSurface } from './ZoomableScatterSurface'

export interface AlcoholCorrelationViewProps {
  /** #536/#537 — full entry set; this card filters by its own stored period. */
  entries: DailyEntry[]
  /** #355 — see `CorrelationViewProps.dragHandle`'s own doc comment. */
  dragHandle?: ReactNode
}

/** Fixed X positions for the two groups — same "two columns, not a real
 * scale" shape `NightEatingCorrelationView.tsx` already uses for its own
 * boolean predictor. */
const NO_X = 0
const YES_X = 1

/**
 * Logged `hadAlcohol` (#607, opt-in day signal — Settings-gated, unlike
 * every other correlation view in this folder) vs. next-day weight change.
 * Same boolean-predictor shape as `NightEatingCorrelationView.tsx`: a
 * plain two-group comparison, not a median split, so the scatter's X axis
 * is two fixed columns ("No"/"Yes"). Renders nothing at all when alcohol
 * tracking is off in Settings, regardless of any already-logged data —
 * the same "toggle off hides the field and correlation" contract the
 * issue asked for.
 */
export function AlcoholCorrelationView({
  entries: allEntries,
  dragHandle,
}: AlcoholCorrelationViewProps) {
  const alcoholTrackingEnabled = useAlcoholTrackingStore(
    (state) => state.enabled,
  )
  const entries = usePeriodFilteredEntries('alcoholCorrelation', allEntries)
  const { period, customStart, customEnd } = useDashboardChartPeriod(
    'alcoholCorrelation',
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
    (state) => state.visible.alcoholCorrelation,
  )

  const rawPoints = alcoholPoints(entries)
  const notesByDate = dayNotesByDate(entries)
  const { flags, axes, isExcluded, toggle, includedPoints } = useOutlierExclusion(
    'alcohol',
    rawPoints,
    (p) => (p.hadAlcohol ? YES_X : NO_X),
    (p) => p.deltaKg,
    (p) => p.date,
  )

  if (!alcoholTrackingEnabled) return null

  if (rawPoints.length === 0) {
    return (
      <EmptyDashboardSection
        chart="alcoholCorrelation"
        title={t.dashboard.alcoholCorrelationTitle}
        description={t.dashboard.alcoholCorrelationEmptyDescription}
        dragHandle={dragHandle}
        visible={cardVisible}
      />
    )
  }

  const metricLabel = t.dailyEntry.hadAlcoholLabel
  const points = rawPoints.map((point, i) => ({
    date: point.date,
    x: point.hadAlcohol ? YES_X : NO_X,
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

  const insight = alcoholCorrelationFromPoints(includedPoints)
  const expanded = insight !== null || isExpanded

  const xValues = points.map((p) => p.x)
  const yValues = points.map((p) => p.delta)
  const baseDomain = scatterDomainFromValues(xValues, yValues)
  const fullDomainOverride = baseDomain
    ? {
        xMin: -0.5,
        xMax: 1.5,
        yMin: baseDomain.yMin,
        yMax: baseDomain.yMax,
      }
    : null

  const cardTitle = (
    <ChartTitleWithToggle
      chart="alcoholCorrelation"
      title={t.dashboard.alcoholCorrelationTitle}
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
                  dataKey="x"
                  name={t.dailyEntry.hadAlcoholLabel}
                  domain={xDomain}
                  allowDataOverflow
                  ticks={[NO_X, YES_X]}
                  tickFormatter={(value: number) =>
                    value === YES_X
                      ? t.dailyEntry.hadAlcoholYesOption
                      : t.dailyEntry.hadAlcoholNoOption
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
                        name === t.dailyEntry.hadAlcoholLabel
                          ? value === YES_X
                            ? t.dailyEntry.hadAlcoholYesOption
                            : t.dailyEntry.hadAlcoholNoOption
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
            {t.dashboard.alcoholCorrelationSummary(
              insight.alcoholAveragedMoreGain ? 'more' : 'less',
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            {t.dashboard.alcoholCorrelationDayCount(insight.dayCount)}{' '}
            {t.dashboard.alcoholCorrelationLagCaveat}
          </p>
          <CorrelationStrengthLabel strength={insight.strength} />
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          {t.dashboard.alcoholCorrelationEmptyDescription}
        </p>
      )}
    </div>
  )
}
