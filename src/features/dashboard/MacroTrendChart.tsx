import type { ReactNode } from 'react'
import { format, parseISO } from 'date-fns'
import { ArrowRight, ChartColumn, ChartLine, ChartScatter } from 'lucide-react'
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
import type { DailyEntry } from '@/domain/dailyEntry'
import { customChartPoints, type TrendChartPeriod } from '@/domain/stats'
import {
  formatNumber,
  getDateFnsLocale,
  useLocale,
  useTranslation,
  type Dictionary,
} from '@/i18n'
import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/toggle-group'
import {
  MACRO_SERIES_KEYS,
  useDashboardChartVisibilityStore,
  useMacroChartSelectionStore,
  type ChartSeriesType,
  type MacroSeriesKey,
} from '@/stores'
import { ChartPeriodPagerControls } from './ChartPeriodPagerControls'
import { ChartTitleWithToggle } from './ChartTitleWithToggle'
import { resolveChartClickDate } from './chartNavigation'
import { useChartPeriodPager } from './useChartPeriodPager'
import { useDashboardChartPeriod } from './useDashboardChartPeriod'

// See WeightTrendChart.tsx's identical constant/reasoning (#217).
const MIN_TREND_DATA_POINTS = 3

const SERIES_COLOR: Record<MacroSeriesKey, string> = {
  protein: 'var(--chart-protein)',
  fat: 'var(--chart-fat)',
  carbs: 'var(--chart-carbs)',
  calories: 'var(--chart-calories)',
}

const CHART_TYPE_ICONS: Record<ChartSeriesType, typeof ChartLine> = {
  line: ChartLine,
  bar: ChartColumn,
  dots: ChartScatter,
}

function labelFor(t: Dictionary, key: MacroSeriesKey): string {
  switch (key) {
    case 'protein':
      return t.dailyEntry.proteinLabel
    case 'fat':
      return t.dailyEntry.fatLabel
    case 'carbs':
      return t.dailyEntry.carbsLabel
    case 'calories':
      return t.dashboard.customChartCaloriesLabel
  }
}

function unitFor(t: Dictionary, key: MacroSeriesKey): string {
  return key === 'calories' ? t.dailyEntry.kcalUnit : t.dailyEntry.gramsUnit
}

export interface MacroTrendChartProps {
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
 * One combined chart rather than a separate small chart per series (#53) —
 * protein/fat/carbs share the same unit (grams) and are comparable in
 * scale, and this keeps the Dashboard from growing three more full-width
 * charts on top of weight/calories/correlation.
 *
 * #501 turned the static legend into the same picker/rendering model the
 * other two multi-series charts already use, and added calories as a
 * fourth series (all four selected by default). Because calories is in the
 * thousands while macros are in the tens/hundreds of grams, the plotted
 * value depends on how many series are on: 1 or 2 selected plot their real
 * values against a real axis (single left axis, or #330's left/right pair),
 * 3+ fall back to `customChartPoints`' per-series 0-100 normalization with
 * the tick values hidden — the same rule `BodyCompositionTrendChart` (#277/
 * #348) and `CustomChartView` (#330/#393) settled on. The tooltip always
 * shows the real logged number, never the normalized plotting coordinate.
 */
export function MacroTrendChart({
  entries: allEntries,
  period: periodOverride,
  customStart: customStartOverride,
  customEnd: customEndOverride,
  dragHandle,
}: MacroTrendChartProps) {
  const t = useTranslation()
  const locale = useLocale()
  const dateFnsLocale = getDateFnsLocale(locale)
  const stored = useDashboardChartPeriod('macros')
  const pager = useChartPeriodPager(
    periodOverride ?? stored.period,
    customStartOverride ?? stored.customStart,
    customEndOverride ?? stored.customEnd,
    allEntries,
  )
  const entries = pager.pagedEntries
  // #245 — see WeightTrendChart.tsx's identical note.
  const chartVisible = useDashboardChartVisibilityStore(
    (state) => state.visible.macros,
  )
  const selected = useMacroChartSelectionStore((state) => state.selected)
  const setSelected = useMacroChartSelectionStore((state) => state.setSelected)
  const chartTypes = useMacroChartSelectionStore((state) => state.chartTypes)
  const setChartType = useMacroChartSelectionStore((state) => state.setChartType)

  // Deliberately built from all four keys, not just the selected ones, so
  // the not-enough-data gate below and each series' own normalization range
  // stay based on everything logged rather than shifting with the picker.
  const points = customChartPoints(entries, MACRO_SERIES_KEYS).filter((point) =>
    MACRO_SERIES_KEYS.some((key) => point.raw[key] !== undefined),
  )

  const chartTitle = (
    <ChartTitleWithToggle
      chart="macros"
      title={t.dashboard.macrosTitle}
      dragHandle={dragHandle}
    />
  )

  // #443 — see WeightTrendChart.tsx's identical note on why this only
  // stops rendering entirely (rather than showing the pager) when paging
  // is inactive.
  if (points.length === 0) {
    if (!pager.showPager) return null
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

  // Fixed key order regardless of click order, so the dual-axis left/right
  // assignment below is deterministic (#330's own note).
  const visibleKeys = MACRO_SERIES_KEYS.filter((key) => selected.includes(key))
  const dualAxis = visibleKeys.length === 2
  const singleAxis = visibleKeys.length === 1
  const realAxis = dualAxis || singleAxis

  const seriesPicker = (
    <ToggleGroup
      type="multiple"
      aria-label={t.dashboard.macrosTitle}
      value={selected}
      onValueChange={(value: string[]) =>
        setSelected(MACRO_SERIES_KEYS.filter((key) => value.includes(key)))
      }
      className="w-fit flex-wrap"
    >
      {MACRO_SERIES_KEYS.map((key) => (
        <ToggleGroupItem key={key} value={key}>
          {/* #451's precedent — the unit lives on the chip, once per
           * series, instead of repeating on every axis tick label. */}
          {`${labelFor(t, key)} (${unitFor(t, key)})`}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )

  if (visibleKeys.length === 0) {
    return (
      <div className="flex flex-col gap-1.5 rounded-lg border border-border p-3">
        {chartTitle}
        {seriesPicker}
        <p className="text-sm text-muted-foreground">
          {t.dashboard.trendChartEmptyDescription}
        </p>
        <ChartPeriodPagerControls pager={pager} />
      </div>
    )
  }

  // #376/#384 — narrow the plotted range to dates where a *selected*
  // series actually has a value, so turning off the series that covers the
  // longest history doesn't leave the x-axis stretched across blank space.
  const visiblePoints = points.filter((point) =>
    visibleKeys.some((key) => point.raw[key] !== undefined),
  )

  const data = visiblePoints.map((point) => {
    const row: Record<string, string | number | undefined> = { date: point.date }
    for (const key of MACRO_SERIES_KEYS) {
      row[`${key}_raw`] = point.raw[key]
      row[`${key}_norm`] = point.normalized[key]
    }
    return row
  })

  // Grams sit flush against the number ("90g") the way every other macro
  // readout in the app writes them; kcal is a spaced word.
  function formatValue(key: MacroSeriesKey, value: number): string {
    const separator = key === 'calories' ? ' ' : ''
    return `${formatNumber(value, locale, 0)}${separator}${unitFor(t, key)}`
  }

  function renderTooltip({ active, label }: TooltipContentProps) {
    if (!active || !label) return null
    const point = visiblePoints.find((p) => p.date === String(label))
    if (!point) return null
    const rows = visibleKeys.filter((key) => point.raw[key] !== undefined)
    if (rows.length === 0) return null
    const date = resolveChartClickDate({ activeLabel: label }, visiblePoints, (p) =>
      visibleKeys.some((key) => p.raw[key] !== undefined),
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
        {rows.map((key) => (
          <p key={key} style={{ color: SERIES_COLOR[key] }}>
            {labelFor(t, key)}: {formatValue(key, point.raw[key]!)}
          </p>
        ))}
        {date && (
          <Link
            to={`/?date=${date}`}
            className="mt-1.5 flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
          >
            {t.dashboard.viewDayLink}
            <ArrowRight aria-hidden="true" className="size-3" />
          </Link>
        )}
      </div>
    )
  }

  function axisIdFor(key: MacroSeriesKey): string {
    if (dualAxis) return key === visibleKeys[0] ? 'left' : 'right'
    return singleAxis ? 'single' : 'normalized'
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border p-3">
      {chartTitle}
      {seriesPicker}
      <ResponsiveContainer width="100%" height={160}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
                orientation="left"
                // Fixed px width rather than "auto" — see #444's note in
                // CustomChartView.tsx on why auto-measurement misbehaves
                // with more than one y-axis in play.
                width={40}
                domain={['auto', 'auto']}
                tick={{ fontSize: 11, fill: SERIES_COLOR[visibleKeys[0]] }}
                tickFormatter={(value: number) => formatNumber(value, locale, 0)}
                axisLine={{ stroke: SERIES_COLOR[visibleKeys[0]] }}
                tickLine={false}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                width={40}
                domain={['auto', 'auto']}
                tick={{ fontSize: 11, fill: SERIES_COLOR[visibleKeys[1]] }}
                tickFormatter={(value: number) => formatNumber(value, locale, 0)}
                axisLine={{ stroke: SERIES_COLOR[visibleKeys[1]] }}
                tickLine={false}
              />
            </>
          ) : singleAxis ? (
            <YAxis
              yAxisId="single"
              width={40}
              domain={['auto', 'auto']}
              tick={{ fontSize: 11, fill: SERIES_COLOR[visibleKeys[0]] }}
              tickFormatter={(value: number) => formatNumber(value, locale, 0)}
              axisLine={false}
              tickLine={false}
            />
          ) : (
            <YAxis
              yAxisId="normalized"
              width={40}
              domain={[0, 100]}
              tick={false}
              axisLine={false}
              tickLine={false}
            />
          )}
          <Tooltip content={renderTooltip} wrapperStyle={{ pointerEvents: 'auto' }} />
          {visibleKeys.map((key) => {
            const dataKey = realAxis ? `${key}_raw` : `${key}_norm`
            const yAxisId = axisIdFor(key)
            if (chartTypes[key] === 'bar') {
              return (
                <Bar
                  key={key}
                  yAxisId={yAxisId}
                  dataKey={dataKey}
                  fill={SERIES_COLOR[key]}
                  radius={[2, 2, 0, 0]}
                  maxBarSize={14}
                  // #198 — see CustomChartView.tsx's identical note.
                  minPointSize={3}
                  isAnimationActive={false}
                />
              )
            }
            if (chartTypes[key] === 'dots') {
              return (
                <Line
                  key={key}
                  yAxisId={yAxisId}
                  type="monotone"
                  dataKey={dataKey}
                  stroke="transparent"
                  dot={{ r: 3, fill: SERIES_COLOR[key], strokeWidth: 0 }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              )
            }
            return (
              <Line
                key={key}
                yAxisId={yAxisId}
                type="monotone"
                dataKey={dataKey}
                stroke={SERIES_COLOR[key]}
                strokeWidth={2}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            )
          })}
        </ComposedChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        {visibleKeys.map((key) => (
          <div key={key} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="size-2 rounded-sm"
              style={{ background: SERIES_COLOR[key] }}
            />
            {labelFor(t, key)}
            <ToggleGroup
              type="single"
              aria-label={t.dashboard.customChartTypeGroupLabel(labelFor(t, key))}
              value={chartTypes[key]}
              onValueChange={(value) => {
                if (!value) return
                setChartType(key, value as ChartSeriesType)
              }}
              className="gap-0 bg-transparent p-0"
            >
              {(['line', 'bar', 'dots'] satisfies ChartSeriesType[]).map(
                (option) => {
                  const Icon = CHART_TYPE_ICONS[option]
                  const optionLabel = {
                    line: t.dashboard.customChartTypeLine,
                    bar: t.dashboard.customChartTypeBar,
                    dots: t.dashboard.customChartTypeDots,
                  }[option]
                  return (
                    <ToggleGroupItem
                      key={option}
                      value={option}
                      aria-label={optionLabel}
                    >
                      <Icon aria-hidden="true" />
                    </ToggleGroupItem>
                  )
                },
              )}
            </ToggleGroup>
          </div>
        ))}
      </div>
      {/* The normalized plotting coordinate only applies once no real axis
        * is on screen — see CustomChartView.tsx's #330 note on why showing
        * this caveat alongside real axis values would contradict them. */}
      {!realAxis && (
        <p className="text-xs text-muted-foreground">
          {t.dashboard.customChartNormalizedCaveat}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        {t.dashboard.chartNavigationHint}
      </p>
      <ChartPeriodPagerControls pager={pager} />
    </div>
  )
}
