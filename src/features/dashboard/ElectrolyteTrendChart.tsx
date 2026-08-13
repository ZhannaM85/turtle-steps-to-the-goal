import { useState, type ReactNode } from 'react'
import { format, parseISO } from 'date-fns'
import { ArrowRight } from 'lucide-react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts'
import { Link } from 'react-router-dom'
import type { DailyEntry } from '@/domain/dailyEntry'
import {
  ELECTROLYTE_SERIES_KEYS,
  electrolytePoints,
  sliceByZoomWindow,
  type ElectrolyteSeriesKey,
  type TrendChartPeriod,
} from '@/domain/stats'
import {
  formatExactNumber,
  getDateFnsLocale,
  useLocale,
  useTranslation,
  type Dictionary,
} from '@/i18n'
import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/toggle-group'
import { Button } from '@/shared/ui/button'
import {
  useDashboardChartVisibilityStore,
  useMicronutrientTrackingStore,
} from '@/stores'
import { ChartPeriodPagerControls } from './ChartPeriodPagerControls'
import { ChartTitleWithToggle } from './ChartTitleWithToggle'
import { resolveChartClickDate } from './chartNavigation'
import { useChartGestureZoom } from './useChartGestureZoom'
import { useChartPeriodPager } from './useChartPeriodPager'
import { useDashboardChartPeriod } from './useDashboardChartPeriod'

// See WeightTrendChart.tsx's identical constant/reasoning (#217).
const MIN_TREND_DATA_POINTS = 3

const SERIES_COLOR: Record<ElectrolyteSeriesKey, string> = {
  sodium: 'var(--stat-sodium)',
  potassium: 'var(--stat-potassium)',
  magnesium: 'var(--stat-magnesium)',
}

function labelFor(t: Dictionary, key: ElectrolyteSeriesKey): string {
  switch (key) {
    case 'sodium':
      return t.dailyEntry.sodiumLabel
    case 'potassium':
      return t.dailyEntry.potassiumLabel
    case 'magnesium':
      return t.dailyEntry.magnesiumLabel
  }
}

export interface ElectrolyteTrendChartProps {
  /** #443 — see `WeightTrendChartProps.entries`'s identical doc comment. */
  entries: DailyEntry[]
  /** #443/#536 — optional test override; live UI uses the store (#537). */
  period?: TrendChartPeriod
  customStart?: string
  customEnd?: string
  /** #355 — see `CorrelationViewProps.dragHandle`'s own doc comment. */
  dragHandle?: ReactNode
}

/**
 * Trend chart for Settings-enabled electrolyte day totals (#530) —
 * sodium / potassium / magnesium in mg. Same normalized-vs-dual/single
 * axis behavior as BodyCompositionTrendChart: these three sit on
 * different mg scales, so sharing one Y-axis on raw values would flatten
 * magnesium. Series picker is local state (defaults to all enabled keys);
 * the Settings micronutrient toggles decide which keys exist at all.
 */
export function ElectrolyteTrendChart({
  entries: allEntries,
  period: periodOverride,
  customStart: customStartOverride,
  customEnd: customEndOverride,
  dragHandle,
}: ElectrolyteTrendChartProps) {
  const t = useTranslation()
  const locale = useLocale()
  const dateFnsLocale = getDateFnsLocale(locale)
  const stored = useDashboardChartPeriod('electrolytes')
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
  const tracked = useMicronutrientTrackingStore((state) => state.tracked)
  const chartVisible = useDashboardChartVisibilityStore(
    (state) => state.visible.electrolytes,
  )
  const enabledKeys = ELECTROLYTE_SERIES_KEYS.filter((key) => tracked[key])
  const [selected, setSelected] =
    useState<ElectrolyteSeriesKey[]>(ELECTROLYTE_SERIES_KEYS)

  if (enabledKeys.length === 0) return null

  const points = electrolytePoints(entries).filter((point) =>
    enabledKeys.some((key) => point.raw[key] !== undefined),
  )

  const chartTitle = (
    <ChartTitleWithToggle
      chart="electrolytes"
      title={t.dashboard.electrolytesTrendTitle}
      dragHandle={dragHandle}
    />
  )

  // #708 — keep the card visible with title + empty copy when there are
  // no points (enabledKeys.length === 0 still returns null above). Pager
  // stays so a paged-to empty window can still page back (#443).
  if (points.length === 0) {
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

  if (!chartVisible) {
    return <div className="flex flex-col gap-1.5 rounded-lg border border-border p-3">{chartTitle}</div>
  }

  if (points.length < MIN_TREND_DATA_POINTS) {
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

  const visibleKeys = enabledKeys.filter((key) => selected.includes(key))
  const dualAxis = visibleKeys.length === 2
  // #348 — exactly 1 series selected: real visible axis (same reasoning
  // as BodyCompositionTrendChart).
  const singleAxis = visibleKeys.length === 1

  const seriesPicker = (
    <ToggleGroup
      type="multiple"
      aria-label={t.dashboard.electrolytesTrendTitle}
      value={selected}
      onValueChange={(value: string[]) =>
        setSelected(enabledKeys.filter((key) => value.includes(key)))
      }
      className="w-fit flex-wrap"
    >
      {enabledKeys.map((key) => (
        <ToggleGroupItem key={key} value={key}>
          {labelFor(t, key)}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )

  function renderTooltip({ active, label }: TooltipContentProps) {
    if (!active || !label) return null
    const point = points.find((p) => p.date === label)
    if (!point) return null
    const rows = visibleKeys.filter((key) => point.raw[key] !== undefined)
    if (rows.length === 0) return null
    const date = resolveChartClickDate(
      { activeLabel: label },
      points,
      (p) => visibleKeys.some((key) => p.raw[key] !== undefined),
    )
    return (
      <div
        className="rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md"
        // See WeightTrendChart.tsx's identical handlers (#33).
        onMouseMove={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        <p className="mb-1 font-medium">
          {format(parseISO(String(label)), 'PP', { locale: dateFnsLocale })}
        </p>
        {rows.map((key) => (
          <p key={key} style={{ color: SERIES_COLOR[key] }}>
            {labelFor(t, key)}:{' '}
            {formatExactNumber(point.raw[key]!, locale)}
            {t.dailyEntry.mgUnit}
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

  if (visibleKeys.length === 0) {
    return (
      <div className="flex flex-col gap-1.5 rounded-lg border border-border p-3">
        {chartTitle}
        {seriesPicker}
        <p className="text-sm text-muted-foreground">
          {t.dashboard.electrolytesEmptyDescription}
        </p>
        <ChartPeriodPagerControls pager={pager} />
      </div>
    )
  }

  // #376 — narrow chart data to dates where at least one visible series
  // has a value (same reasoning as BodyCompositionTrendChart).
  const visiblePoints = points.filter((point) =>
    visibleKeys.some((key) => point.raw[key] !== undefined),
  )

  const data = visiblePoints.map((point) => {
    const row: Record<string, string | number | undefined> = {
      date: point.date,
    }
    for (const key of enabledKeys) {
      row[`${key}_norm`] = point.normalized[key]
      row[`${key}_raw`] = point.raw[key]
    }
    return row
  })
  const displayData = sliceByZoomWindow(data, zoomWindow)

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border p-3">
      {chartTitle}
      {seriesPicker}
      <div
        ref={surfaceRef}
        className="touch-pan-y"
        data-point-count={data.length}
      >
        <ResponsiveContainer width="100%" height={160}>
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
          {dualAxis ? (
            <>
              <YAxis
                yAxisId="left"
                width={40}
                domain={['auto', 'auto']}
                tick={{ fontSize: 11, fill: SERIES_COLOR[visibleKeys[0]] }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                width={40}
                domain={['auto', 'auto']}
                tick={{ fontSize: 11, fill: SERIES_COLOR[visibleKeys[1]] }}
                axisLine={false}
                tickLine={false}
              />
            </>
          ) : singleAxis ? (
            <YAxis
              yAxisId="single"
              width={40}
              domain={['auto', 'auto']}
              tick={{ fontSize: 11, fill: SERIES_COLOR[visibleKeys[0]] }}
              axisLine={false}
              tickLine={false}
            />
          ) : (
            <YAxis
              width={40}
              domain={[0, 100]}
              tick={false}
              axisLine={false}
              tickLine={false}
            />
          )}
          <Tooltip
            active={isGesturing ? false : undefined}
            content={renderTooltip}
            wrapperStyle={{ pointerEvents: 'none' }}
          />
          {visibleKeys.map((key, index) => (
            <Line
              key={key}
              yAxisId={
                dualAxis
                  ? index === 0
                    ? 'left'
                    : 'right'
                  : singleAxis
                    ? 'single'
                    : undefined
              }
              type="monotone"
              dataKey={dualAxis || singleAxis ? `${key}_raw` : `${key}_norm`}
              stroke={SERIES_COLOR[key]}
              strokeWidth={2}
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
          ))}
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
      <span className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {visibleKeys.map((key) => (
          <i key={key} className="flex items-center gap-1 not-italic">
            <span
              aria-hidden="true"
              className="size-2 rounded-sm"
              style={{ background: SERIES_COLOR[key] }}
            />
            {labelFor(t, key)}
          </i>
        ))}
      </span>
      <p className="text-xs text-muted-foreground">
        {t.dashboard.chartNavigationHint}
      </p>
      <ChartPeriodPagerControls pager={pager} />
    </div>
  )
}
