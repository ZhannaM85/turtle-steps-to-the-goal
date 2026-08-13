import type { ReactNode } from 'react'
import { format, parseISO, subDays } from 'date-fns'
import { ArrowRight } from 'lucide-react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type DotItemDotProps,
  type TooltipContentProps,
} from 'recharts'
import { Link } from 'react-router-dom'
import type { DailyEntry } from '@/domain/dailyEntry'
import { kgToLb } from '@/domain/goal'
import {
  rollingAverage,
  sliceByZoomWindow,
  type TrendChartPeriod,
} from '@/domain/stats'
import {
  formatNumber,
  getDateFnsLocale,
  unitLabel,
  useLocale,
  useTranslation,
} from '@/i18n'
import {
  useCycleTrackingStore,
  useDashboardChartVisibilityStore,
  useOutlierExclusionStore,
  useTrendChartSeriesStore,
  useUnitStore,
} from '@/stores'
import { Button } from '@/shared/ui/button'
import { ChartPeriodPagerControls } from './ChartPeriodPagerControls'
import { ChartTitleWithToggle } from './ChartTitleWithToggle'
import { resolveChartClickDate } from './chartNavigation'
import { isLoggedPeriodDay } from './cyclePeriodDay'
import { OutlierPointsList } from './OutlierPointsList'
import { useChartGestureZoom } from './useChartGestureZoom'
import { useChartPeriodPager } from './useChartPeriodPager'
import { useDashboardChartPeriod } from './useDashboardChartPeriod'

// #455 — same tap-to-exclude bookkeeping the 6 correlation views already
// share via `useOutlierExclusion`/`OutlierPointsList`, reused here directly
// against the store rather than that hook: this chart's own #448 flagging
// (a flat day-over-day kg delta) isn't the 2D Tukey's-fences shape
// `useOutlierExclusion` computes, so only the store + list component
// generalize, not the flagging math itself. One stable view key, since
// there's only ever one Weight trend chart.
const WEIGHT_TREND_OUTLIER_VIEW_KEY = 'weightTrend'
// Stable reference for "no exclusions yet" — see useOutlierExclusion.ts's
// own identical comment for why a fresh `{}` per render would loop.
const EMPTY_EXCLUDED: Record<string, true> = {}

interface ChartPoint {
  date: string
  weight?: number
  average?: number
}

// #214: matches CalorieTrendChart.tsx's own established window — no
// window-size picker (14/30-day were only ever "possibly" in the
// original request; a fixed 7-day window is the one concretely asked
// for, and keeps this consistent with the app's one other rolling-
// average chart rather than introducing a new UI control).
const ROLLING_WINDOW_DAYS = 7

// #217: below this, a straight line connecting just 1-2 far-apart points can
// read as a confident trend that isn't real — show a plain "not enough
// data" message instead of the chart. Zero points still renders nothing at
// all (see below), same as before this issue.
const MIN_TREND_DATA_POINTS = 3

export interface WeightTrendChartProps {
  /** #443 — the *full*, not period-filtered, set: this chart resolves its
   * own visible window via `useChartPeriodPager` (using `period` below),
   * since paging needs access to days outside whatever range the caller
   * would otherwise have pre-filtered to. */
  entries: DailyEntry[]
  /** #443/#536 — optional override for tests; live Dashboard reads the
   * chart's own store selection via `useDashboardChartPeriod('weight')`
   * (#537 — parent must not pass these or the whole page re-renders). */
  period?: TrendChartPeriod
  customStart?: string
  customEnd?: string
  /** #355 — see `CorrelationViewProps.dragHandle`'s own doc comment. */
  dragHandle?: ReactNode
}

export function WeightTrendChart({
  entries: allEntries,
  period: periodOverride,
  customStart: customStartOverride,
  customEnd: customEndOverride,
  dragHandle,
}: WeightTrendChartProps) {
  const t = useTranslation()
  const locale = useLocale()
  const dateFnsLocale = getDateFnsLocale(locale)
  const displayUnit = useUnitStore((state) => state.unit)
  // #615 — one-line factual note, cycle-tracking users only; no per-user
  // predicted window, just a general "period days are known noise" fact.
  // Scoped in the tooltip below to whichever exact day is actually being
  // looked at (via isLoggedPeriodDay) — reported live twice that any
  // days-before/after window (first the whole viewed range, then a 5-day
  // radius) still surfaced the note on days with no real connection to a
  // logged period. Sourced from allEntries rather than the paged/zoomed
  // `entries` used elsewhere below, so this stays correct regardless of
  // which page happens to be open.
  const cycleTrackingEnabled = useCycleTrackingStore((state) => state.enabled)
  const periodDates = allEntries
    .filter((entry) => entry.onPeriod)
    .map((entry) => entry.date)
  // #455 — hooks must run before this component's own early returns below
  // (rules-of-hooks), even though this value is only read much further down.
  const excludedWeightDates = useOutlierExclusionStore(
    (state) => state.excluded[WEIGHT_TREND_OUTLIER_VIEW_KEY] ?? EMPTY_EXCLUDED,
  )
  const toggleExcludedWeightDate = useOutlierExclusionStore(
    (state) => state.toggleExcluded,
  )
  const stored = useDashboardChartPeriod('weight')
  const pager = useChartPeriodPager(
    periodOverride ?? stored.period,
    customStartOverride ?? stored.customStart,
    customEndOverride ?? stored.customEnd,
    allEntries,
  )
  const gestureResetKey = `${periodOverride ?? stored.period}|${customStartOverride ?? stored.customStart}|${customEndOverride ?? stored.customEnd}|${pager.range.start ?? ''}|${pager.range.end ?? ''}`
  const { surfaceRef, zoomWindow, isZoomed, isGesturing, resetZoom } =
    useChartGestureZoom(gestureResetKey)
  const entries = pager.pagedEntries
  const toDisplay = (kg: number) => (displayUnit === 'lb' ? kgToLb(kg) : kg)
  // #238 — independent per chart, someone might want the average on one
  // trend chart and not the other.
  const visible = useTrendChartSeriesStore((state) => state.visible.weight)
  const toggleSeries = useTrendChartSeriesStore((state) => state.toggleSeries)
  // #245 — whole-chart visibility, distinct from #238's within-chart series
  // toggle above.
  const chartVisible = useDashboardChartVisibilityStore(
    (state) => state.visible.weight,
  )

  const weightPoints = entries
    .filter(
      (entry): entry is DailyEntry & { weightKg: number } =>
        entry.weightKg !== undefined,
    )
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((entry) => ({ date: entry.date, weight: toDisplay(entry.weightKg) }))

  // #443 — when paging is active (period is week/month/year), a paged-to
  // window can legitimately have zero points even though other windows
  // don't; returning null would strand the user with no way to page back.
  // With paging inactive ('all'/'custom', every pre-#443 caller), this
  // stays the exact `return null` it always was.
  if (weightPoints.length === 0) {
    return (
      <div className="flex flex-col gap-1.5 rounded-lg border border-border p-3">
        <ChartTitleWithToggle
          chart="weight"
          title={t.dashboard.weightTrendTitle}
          dragHandle={dragHandle}
        />
        <p className="text-sm text-muted-foreground">
          {t.dashboard.notEnoughTrendDataMessage}
        </p>
        <ChartPeriodPagerControls pager={pager} />
      </div>
    )
  }

  const chartTitle = (
    <ChartTitleWithToggle
      chart="weight"
      title={t.dashboard.weightTrendTitle}
      dragHandle={dragHandle}
    />
  )

  if (!chartVisible) {
    return <div className="flex flex-col gap-1.5 rounded-lg border border-border p-3">{chartTitle}</div>
  }

  if (weightPoints.length < MIN_TREND_DATA_POINTS) {
    return (
      <div className="flex flex-col gap-1.5 rounded-lg border border-border p-3">
        {chartTitle}
        <p className="text-sm text-muted-foreground">
          {t.dashboard.notEnoughTrendDataMessage}
        </p>
        <ChartPeriodPagerControls pager={pager} />
      </div>
    )
  }

  // rollingAverage() itself always works in canonical kg (DailyEntry's own
  // unit) — converted to the display unit per-point here, same as the raw
  // weight values above, rather than averaging already-converted numbers
  // (equivalent for a linear conversion like kg<->lb, but keeps the
  // averaging math working against the entries' real stored values).
  const rollingPoints = rollingAverage(entries, 'weightKg', ROLLING_WINDOW_DAYS)
    .filter(
      (point): point is { date: string; average: number } =>
        point.average !== null,
    )
    .map((point) => ({ date: point.date, average: toDisplay(point.average) }))

  const merged = new Map<string, ChartPoint>()
  for (const point of weightPoints) {
    merged.set(point.date, { ...merged.get(point.date), ...point })
  }
  for (const point of rollingPoints) {
    merged.set(point.date, { ...merged.get(point.date), ...point })
  }
  const data = [...merged.values()].sort((a, b) => a.date.localeCompare(b.date))
  const displayData = sliceByZoomWindow(data, zoomWindow)

  // The special "current value" dot (below) marks the most recent day
  // that actually has a logged weight — not just the last row in `data`,
  // which can trail off with average-only points on days that logged
  // something else but no weight (rollingAverage() covers every entry
  // date, not only weight-logged ones).
  const lastWeightDate = weightPoints[weightPoints.length - 1].date
  const lastWeightIndex = displayData.findIndex(
    (point) => point.date === lastWeightDate,
  )

  // #441 — reported live with a screenshot: an obvious single-point
  // data-entry-error spike rendered identically to every real point, no
  // visual flag at all. Originally reused the Tukey's-fences rule (#224)
  // the 6 correlation views use for their own scatter points — #448
  // replaced that with a simpler, deterministic rule instead (confirmed
  // live once #441's own statistical version was working): flag a point
  // if it's more than 2kg away from the *immediately preceding calendar
  // day's* own logged weight, same "previous day" concept #401's existing
  // save-time `isUnusualWeightDeltaKg` warning already uses elsewhere —
  // resolved via `AskUserQuestion` over comparing against the 7-day
  // rolling average or the visible range's overall median instead.
  // Computed against canonical kg (not the display-converted `weight`
  // values below), same as `isUnusualWeightDeltaKg`, so the 2kg threshold
  // means the same thing regardless of the user's kg/lb display setting.
  const OUTLIER_DELTA_KG = 2
  const weightKgByDate = new Map(
    entries
      .filter((entry): entry is DailyEntry & { weightKg: number } =>
        entry.weightKg !== undefined,
      )
      .map((entry) => [entry.date, entry.weightKg]),
  )
  const outlierDates = new Set(
    [...weightKgByDate.entries()]
      .filter(([date, weightKg]) => {
        const previousDate = format(subDays(parseISO(date), 1), 'yyyy-MM-dd')
        const previousWeightKg = weightKgByDate.get(previousDate)
        return (
          previousWeightKg !== undefined &&
          Math.abs(weightKg - previousWeightKg) > OUTLIER_DELTA_KG
        )
      })
      .map(([date]) => date),
  )
  const isWeightOutlier = (date: string) => outlierDates.has(date)

  // #455 — lets the user dismiss a flagged point they've confirmed is a
  // real value, without it affecting anything else on the chart (the
  // rolling average, or whether a neighboring day's own delta gets
  // flagged, are both untouched — same "excluded from the summary, not
  // rewritten out of the data" spirit the correlation views already use).
  const isExcludedWeightDate = (date: string) =>
    Boolean(excludedWeightDates[date])
  const outlierWeightPoints = weightPoints.filter((point) =>
    isWeightOutlier(point.date),
  )

  const unit = unitLabel(displayUnit, t)

  // Tapping/hovering a point only ever shows the tooltip (#49) — the
  // in-tooltip link is the sole way to navigate, so a stray tap elsewhere
  // on the chart doesn't yank the user away from just glancing at values.
  // Recharts' tooltip wrapper is pointer-events:none by default (so
  // hovering the tooltip itself doesn't interrupt mouse tracking on the
  // chart) — wrapperStyle below re-enables it so the link is clickable.
  function renderTooltip({ active, label, payload }: TooltipContentProps) {
    if (!active || !payload || payload.length === 0) return null
    const date = resolveChartClickDate(
      { activeLabel: label },
      data,
      (point) => point.weight !== undefined,
    )
    return (
      <div
        className="rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md"
        // Recharts tracks the active point via move events bubbling up to
        // its wrapper div, which this tooltip is a child of. Without this,
        // a finger drifting from "tap to open" toward the link below (#33)
        // can silently retarget the active point to whichever date the
        // tooltip box happens to overlap, so the link navigates to a
        // different day than the one still visibly shown in the text.
        onMouseMove={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        <p className="mb-1 font-medium">
          {format(parseISO(String(label)), 'PP', { locale: dateFnsLocale })}
        </p>
        {/* #214: both series (either can be absent on a given day — an
         * early day before the rolling window fills has no average yet,
         * and (rarer) a day that logged something else but no weight has
         * no raw value) rather than only ever reading payload[0]. */}
        {payload.map((item) =>
          item.value === undefined || item.value === null ? null : (
            <p key={String(item.dataKey)}>
              {formatNumber(Number(item.value), locale)} {unit} ·{' '}
              {item.dataKey === 'average'
                ? t.dashboard.rollingAverageLegend
                : t.dashboard.weightLegend}
            </p>
          ),
        )}
        {/* #615 — only when this specific tooltip date is itself a logged
         * period day, not a days-before/after window around one (see
         * isLoggedPeriodDay's own comment). */}
        {cycleTrackingEnabled &&
          isLoggedPeriodDay(String(label), periodDates) && (
            <p className="mt-1 max-w-[220px] text-muted-foreground">
              {t.dashboard.cyclePeriodWeightNote}
            </p>
          )}
        {date && (
          <Link
            to={`/?date=${date}`}
            className="pointer-events-auto mt-1.5 flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
          >
            {t.dashboard.viewDayLink}
            <ArrowRight aria-hidden="true" className="size-3" />
          </Link>
        )}
      </div>
    )
  }

  const bothHidden = !visible.raw && !visible.average

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border p-3">
      {chartTitle}
      {bothHidden ? (
        // #238 regression, caught live: this used to be an early return
        // before the legend below, so turning both series off made the
        // only way to turn them back on disappear along with the chart —
        // a self-locking dead end with no recovery path in the UI at all.
        // The legend (with its toggle buttons) must always render
        // regardless of which state this branch takes.
        <p className="text-sm text-muted-foreground">
          {t.dashboard.trendChartEmptyDescription}
        </p>
      ) : (
        <>
          <div
            ref={surfaceRef}
            className="touch-pan-y"
            data-point-count={data.length}
          >
            <ResponsiveContainer width="100%" height={180}>
              <LineChart
                data={displayData}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
            tickFormatter={(date: string) =>
              format(parseISO(date), 'PP', { locale: dateFnsLocale })
            }
            axisLine={{ stroke: 'var(--border)' }}
            tickLine={false}
          />
          <YAxis
            width={40}
            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
            axisLine={false}
            tickLine={false}
            domain={['auto', 'auto']}
          />
          <Tooltip
            active={isGesturing ? false : undefined}
            content={renderTooltip}
            wrapperStyle={{ pointerEvents: 'none' }}
          />
          {visible.raw && (
            <Line
              type="monotone"
              dataKey="weight"
              stroke="var(--chart-weight)"
              strokeWidth={2.5}
              connectNulls={false}
              dot={(props: DotItemDotProps) => {
                const { cx, cy, index } = props
                if (cx == null || cy == null || index == null) {
                  return <g key={index} />
                }
                // #441 — an outlier point always renders flagged, not just
                // when it's also the current-value marker below. #455: one
                // the user has since excluded renders dimmed instead, same
                // treatment `outlierScatterShape.tsx` already uses for the
                // correlation views' own excluded points.
                if (
                  displayData[index] &&
                  isWeightOutlier(displayData[index].date)
                ) {
                  return (
                    <circle
                      key={index}
                      cx={cx}
                      cy={cy}
                      r={4}
                      fill="var(--destructive)"
                      opacity={
                        isExcludedWeightDate(displayData[index].date) ? 0.3 : 1
                      }
                    />
                  )
                }
                if (index !== lastWeightIndex) {
                  return <g key={index} />
                }
                return (
                  <circle
                    key={index}
                    cx={cx}
                    cy={cy}
                    r={3.5}
                    fill="var(--chart-weight)"
                  />
                )
              }}
              activeDot={{ r: 4 }}
              isAnimationActive={false}
            />
          )}
          {/* #214: a dashed, muted-gray line — deliberately not a second
           * solid `--chart-weight` line the way CalorieTrendChart.tsx
           * overlays its own rolling average, since that chart's average
           * line sits over a *different*-colored Bar series (no visual
           * clash); here both series are the same metric, so a same-color
           * solid pair would be hard to tell apart at a glance. The dash
           * reads as "smoothed variant of the line next to it" rather
           * than a second real data series. */}
          {visible.average && (
            <Line
              type="monotone"
              dataKey="average"
              stroke="var(--muted-foreground)"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
          )}
              </LineChart>
            </ResponsiveContainer>
          </div>
          {isZoomed && (
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                {t.dashboard.customChartZoomHint}
              </p>
              <Button type="button" variant="ghost" size="sm" onClick={resetZoom}>
                {t.dashboard.customChartResetZoomButton}
              </Button>
            </div>
          )}
        </>
      )}
      {/* #455 — tap-to-exclude chips for every currently-flagged point,
       * same shared component the 6 correlation views already use. */}
      <OutlierPointsList
        points={outlierWeightPoints}
        isExcluded={(point) => isExcludedWeightDate(point.date)}
        onToggle={(point) =>
          toggleExcludedWeightDate(WEIGHT_TREND_OUTLIER_VIEW_KEY, point.date)
        }
        getKey={(point) => point.date}
        getDate={(point) => point.date}
        formatLabel={(point) =>
          format(parseISO(point.date), 'd MMM yyyy', { locale: dateFnsLocale })
        }
      />
      {/* #238: legend doubles as a show/hide toggle per series — was purely
       * decorative before, no way to turn either off. Always rendered,
       * even in the bothHidden branch above — this is the only way back. */}
      <span className="flex gap-3 text-xs text-muted-foreground">
        <button
          type="button"
          aria-pressed={visible.raw}
          onClick={() => toggleSeries('weight', 'raw')}
          className={
            visible.raw
              ? 'flex items-center gap-1'
              : 'flex items-center gap-1 opacity-50'
          }
        >
          <span
            aria-hidden="true"
            className="size-2 rounded-sm"
            style={{ background: 'var(--chart-weight)' }}
          />
          {t.dashboard.weightLegend}
        </button>
        <button
          type="button"
          aria-pressed={visible.average}
          onClick={() => toggleSeries('weight', 'average')}
          className={
            visible.average
              ? 'flex items-center gap-1'
              : 'flex items-center gap-1 opacity-50'
          }
        >
          <span
            aria-hidden="true"
            className="size-2 rounded-sm"
            style={{ background: 'var(--muted-foreground)' }}
          />
          {t.dashboard.rollingAverageLegend}
        </button>
      </span>
      {!bothHidden && (
        <p className="text-xs text-muted-foreground">
          {t.dashboard.chartNavigationHint}
        </p>
      )}
      <ChartPeriodPagerControls pager={pager} />
    </div>
  )
}
