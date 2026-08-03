import type { ReactNode } from 'react'
import { format, parseISO } from 'date-fns'
import { ArrowRight } from 'lucide-react'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts'
import { Link } from 'react-router-dom'
import { totalCalories, type DailyEntry } from '@/domain/dailyEntry'
import { rollingAverage, sliceByZoomWindow, type TrendChartPeriod } from '@/domain/stats'
import {
  formatNumber,
  getDateFnsLocale,
  useLocale,
  useTranslation,
} from '@/i18n'
import { useDashboardChartVisibilityStore, useTrendChartSeriesStore } from '@/stores'
import { Button } from '@/shared/ui/button'
import { ChartPeriodPagerControls } from './ChartPeriodPagerControls'
import { ChartTitleWithToggle } from './ChartTitleWithToggle'
import { resolveChartClickDate } from './chartNavigation'
import { useChartGestureZoom } from './useChartGestureZoom'
import { useChartPeriodPager } from './useChartPeriodPager'
import { useDashboardChartPeriod } from './useDashboardChartPeriod'

interface ChartPoint {
  date: string
  calories?: number
  average?: number
}

const ROLLING_WINDOW_DAYS = 7

// See WeightTrendChart.tsx's identical constant/reasoning (#217).
const MIN_TREND_DATA_POINTS = 3

export interface CalorieTrendChartProps {
  /** #443 — see `WeightTrendChartProps.entries`'s identical doc comment. */
  entries: DailyEntry[]
  /** #443/#536 — optional test override; live UI uses the store (#537). */
  period?: TrendChartPeriod
  customStart?: string
  customEnd?: string
  /** #355 — see `CorrelationViewProps.dragHandle`'s own doc comment. */
  dragHandle?: ReactNode
}

export function CalorieTrendChart({
  entries: allEntries,
  period: periodOverride,
  customStart: customStartOverride,
  customEnd: customEndOverride,
  dragHandle,
}: CalorieTrendChartProps) {
  const t = useTranslation()
  const locale = useLocale()
  const dateFnsLocale = getDateFnsLocale(locale)
  const stored = useDashboardChartPeriod('calories')
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
  // #238 — see WeightTrendChart.tsx's identical note.
  const visible = useTrendChartSeriesStore((state) => state.visible.calories)
  const toggleSeries = useTrendChartSeriesStore((state) => state.toggleSeries)
  // #245 — see WeightTrendChart.tsx's identical note.
  const chartVisible = useDashboardChartVisibilityStore(
    (state) => state.visible.calories,
  )

  const calorieBars = entries
    .map((entry) => ({
      date: entry.date,
      calories: totalCalories(entry.calorieEntries, entry.dayTotals),
    }))
    .filter(
      (point): point is { date: string; calories: number } =>
        point.calories !== undefined,
    )
    .sort((a, b) => a.date.localeCompare(b.date))

  // #443 — see WeightTrendChart.tsx's identical note on why this only
  // stops rendering entirely (rather than showing the pager) when paging
  // is inactive.
  if (calorieBars.length === 0) {
    if (!pager.showPager) return null
    return (
      <div className="flex flex-col gap-1.5 rounded-lg border border-border p-3">
        <ChartTitleWithToggle
          chart="calories"
          title={t.dashboard.calorieTrendTitle}
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
      chart="calories"
      title={t.dashboard.calorieTrendTitle}
      dragHandle={dragHandle}
    />
  )

  if (!chartVisible) {
    return <div className="flex flex-col gap-1.5 rounded-lg border border-border p-3">{chartTitle}</div>
  }

  if (calorieBars.length < MIN_TREND_DATA_POINTS) {
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

  const rolling = rollingAverage(
    entries,
    (entry) => totalCalories(entry.calorieEntries, entry.dayTotals),
    ROLLING_WINDOW_DAYS,
  )
    .filter(
      (point): point is { date: string; average: number } =>
        point.average !== null,
    )
    .map((point) => ({ date: point.date, average: point.average }))

  const merged = new Map<string, ChartPoint>()
  for (const point of calorieBars) {
    merged.set(point.date, { ...merged.get(point.date), ...point })
  }
  for (const point of rolling) {
    merged.set(point.date, { ...merged.get(point.date), ...point })
  }
  const data = [...merged.values()].sort((a, b) => a.date.localeCompare(b.date))
  const displayData = sliceByZoomWindow(data, zoomWindow)

  // Tapping/hovering a point only ever shows the tooltip (#49) — the
  // in-tooltip link is the sole way to navigate, so a stray tap elsewhere
  // on the chart doesn't yank the user away from just glancing at values.
  // Recharts' tooltip wrapper defaults to pointer-events:none; keep that
  // (#572 — pinch must pass through) and re-enable only on the day link.
  function renderTooltip({ active, label, payload }: TooltipContentProps) {
    if (!active || !payload || payload.length === 0) return null
    const date = resolveChartClickDate(
      { activeLabel: label },
      data,
      (point) => point.calories !== undefined,
    )
    return (
      <div
        className="rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md"
        // See WeightTrendChart.tsx's identical handlers (#33) — prevents a
        // finger drifting toward the in-tooltip link from silently
        // retargeting Recharts' active point to a different date.
        onMouseMove={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        <p className="mb-1 font-medium">
          {format(parseISO(String(label)), 'PP', { locale: dateFnsLocale })}
        </p>
        {payload.map((item) => (
          <p key={String(item.dataKey)}>
            {formatNumber(Number(item.value), locale, 0)}{' '}
            {item.dataKey === 'average'
              ? t.dashboard.rollingAverageLegend
              : t.dashboard.caloriesLegend}
          </p>
        ))}
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
        // #238 regression, caught live — see WeightTrendChart.tsx's
        // identical note. The legend below must always render, even here.
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
            <ResponsiveContainer width="100%" height={160}>
              <ComposedChart
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
            />
            <Tooltip
              active={isGesturing ? false : undefined}
              content={renderTooltip}
              wrapperStyle={{ pointerEvents: 'none' }}
            />
            {visible.raw && (
              <Bar
                dataKey="calories"
                fill="var(--chart-calories)"
                radius={[3, 3, 0, 0]}
                isAnimationActive={false}
              />
            )}
            {visible.average && (
              <Line
                type="monotone"
                dataKey="average"
                stroke="var(--chart-weight)"
                strokeWidth={2}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            )}
              </ComposedChart>
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
      {/* #238: legend doubles as a show/hide toggle per series — see
       * WeightTrendChart.tsx's identical note. */}
      <span className="flex gap-3 text-xs text-muted-foreground">
        <button
          type="button"
          aria-pressed={visible.raw}
          onClick={() => toggleSeries('calories', 'raw')}
          className={
            visible.raw
              ? 'flex items-center gap-1'
              : 'flex items-center gap-1 opacity-50'
          }
        >
          <span
            aria-hidden="true"
            className="size-2 rounded-sm"
            style={{ background: 'var(--chart-calories)' }}
          />
          {t.dashboard.caloriesLegend}
        </button>
        <button
          type="button"
          aria-pressed={visible.average}
          onClick={() => toggleSeries('calories', 'average')}
          className={
            visible.average
              ? 'flex items-center gap-1'
              : 'flex items-center gap-1 opacity-50'
          }
        >
          <span
            aria-hidden="true"
            className="size-2 rounded-sm"
            style={{ background: 'var(--chart-weight)' }}
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
