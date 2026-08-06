import { useState, type ReactNode } from 'react'
import { format, parseISO, startOfWeek } from 'date-fns'
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
  correlationInsightFromPoints,
  correlationInsightPoints,
  todayIsoForDayStart,
  weeklyCorrelationExcludesCurrentWeek,
} from '@/domain/stats'
import {
  formatNumber,
  getDateFnsLocale,
  unitLabel,
  useLocale,
  useTranslation,
} from '@/i18n'
import {
  useDashboardChartVisibilityStore,
  useDayStartStore,
  useUnitStore,
} from '@/stores'
import { useOutlierExclusion, useWeekStartsOn } from '@/shared/hooks'
import { Button } from '@/shared/ui/button'
import { ChartTitleWithToggle } from './ChartTitleWithToggle'
import { CorrelationChartTooltip } from './CorrelationChartTooltip'
import { CorrelationStrengthLabel } from './CorrelationStrengthLabel'
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
  // The plot itself is collapsed by default until there's an actual
  // insight to show (#89) — with under MIN_COMPARABLE_WEEKS worth of data
  // it's just a near-empty scatter for the first several weeks of use,
  // which read as broken rather than "come back later". The caveat text
  // explaining that stays visible either way; only the chart is opt-in.
  // Once real data exists, the chart renders expanded by default — no
  // toggle shown, since there's now something worth seeing at a glance.
  const [isExpanded, setIsExpanded] = useState(false)
  // #247 — whole-card show/hide, same mechanism #245 gave the trend
  // charts. Distinct from isExpanded above, which is this card's own
  // internal "show the scatter plot" toggle.
  const cardVisible = useDashboardChartVisibilityStore(
    (state) => state.visible.calorieWeightCorrelation,
  )

  const weekStartsOn = useWeekStartsOn(entries)
  // #601 — "is this week still in progress" should respect day-start too,
  // same meaning `TodayScreen.tsx`'s own "today" already uses.
  const dayStartTime = useDayStartStore((state) => state.dayStartTime)
  const asOfDate = todayIsoForDayStart(dayStartTime)
  const rawPoints = correlationInsightPoints(entries, weekStartsOn, asOfDate)
  // #613 — trust-footer honesty note: tells the user their current,
  // still-in-progress week is deliberately left out of the count below,
  // rather than that just looking like a silent gap (#522's own exclusion).
  const excludesCurrentWeek = weeklyCorrelationExcludesCurrentWeek(
    entries,
    weekStartsOn,
    asOfDate,
  )
  const notesByDate = dayNotesByDate(entries)
  // #631 — these points are keyed by `weekStart`, but that Monday itself
  // often has no logged weight: `deltaVsPriorWeekKg` (what actually makes a
  // week "unusual") is this week's *average* weight vs. the prior week's,
  // and the days behind that average can land anywhere in the week.
  // `weeklySummaries` only sets a week's `deltaVsPriorWeekKg` when its own
  // `averageWeightKg` is non-null, so every flagged week is guaranteed to
  // have at least one real weight entry somewhere inside it — this maps
  // each week's start to the earliest such date, so the "view day" link
  // below lands somewhere real instead of a possibly-empty Monday.
  const weightDateByWeekStart = new Map<string, string>()
  for (const entry of entries) {
    if (entry.weightKg === undefined) continue
    const ws = format(
      startOfWeek(parseISO(entry.date), { weekStartsOn }),
      'yyyy-MM-dd',
    )
    const existing = weightDateByWeekStart.get(ws)
    if (existing === undefined || entry.date < existing) {
      weightDateByWeekStart.set(ws, entry.date)
    }
  }
  const { flags, axes, isExcluded, toggle, includedPoints } =
    useOutlierExclusion(
      'calorieWeight',
      rawPoints,
      (p) => p.calories,
      (p) => p.delta,
      (p) => p.weekStart,
    )
  // #631 (reopened) — `getDate` below was fixed to resolve to this date
  // instead of `point.weekStart`, but the chip's own label and note preview
  // were left reading `point.weekStart` directly, so the chip could show
  // one date while its link navigated to another. All three now read off
  // this same resolved date.
  const resolvedDate = (point: { weekStart: string }) =>
    weightDateByWeekStart.get(point.weekStart) ?? point.weekStart

  if (rawPoints.length === 0) return null

  const metricLabel = t.dashboard.caloriesLegend
  const points = rawPoints.map((point, i) => ({
    // This view's points are whole weeks, not days — the chart's hover
    // tooltip links to that week's start. `OutlierPointsList` below is
    // different: for flagged weeks, its link/label/note preview all resolve
    // to the day within the week that actually has the logged weight (#631),
    // which won't always be this same Monday.
    date: point.weekStart,
    calories: point.calories,
    delta: toDisplay(point.delta),
    isOutlier: flags[i],
    isExcluded: isExcluded(point),
    outlierReason: flags[i]
      ? outlierReasonLabel(t.dashboard, axes[i], metricLabel)
      : undefined,
    dayNotePreview: notesByDate.get(point.weekStart),
  }))
  const outlierPoints = rawPoints.filter((_, i) => flags[i])
  const reasonByKey = new Map(
    rawPoints.flatMap((point, i) =>
      flags[i]
        ? [
            [
              point.weekStart,
              outlierReasonLabel(t.dashboard, axes[i], metricLabel),
            ] as const,
          ]
        : [],
    ),
  )

  const insight = correlationInsightFromPoints(includedPoints)
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
          xValues={points.map((p) => p.calories)}
          yValues={points.map((p) => p.delta)}
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
                  name={t.dashboard.weeklyChangeLegend}
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
                  active={isGesturing ? false : undefined}
                  cursor={{ strokeDasharray: '3 3', stroke: 'var(--border)' }}
                  wrapperStyle={{ pointerEvents: 'auto' }}
                  content={
                    <CorrelationChartTooltip
                      formatValue={(value, name) =>
                        name === t.dashboard.caloriesLegend
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
        </ZoomableScatterSurface>
      )}
      {expanded && (
        <OutlierPointsList
          points={outlierPoints}
          isExcluded={isExcluded}
          onToggle={toggle}
          getKey={(point) => point.weekStart}
          getDate={resolvedDate}
          formatLabel={(point) =>
            format(parseISO(resolvedDate(point)), 'd MMM yyyy', {
              locale: dateFnsLocale,
            })
          }
          formatReason={(point) => reasonByKey.get(point.weekStart)}
          formatNotePreview={(point) => notesByDate.get(resolvedDate(point))}
        />
      )}
      {insight ? (
        <>
          <p className="text-sm text-foreground">
            {t.dashboard.correlationSummary(
              insight.thresholdKcal,
              insight.lowerAveragedMoreLoss ? 'lower' : 'higher',
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            {t.dashboard.correlationWeekCount(insight.weekCount)}{' '}
            {t.dashboard.correlationLagCaveat}
            {excludesCurrentWeek && (
              <> {t.dashboard.correlationCurrentWeekExcludedNote}</>
            )}
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
