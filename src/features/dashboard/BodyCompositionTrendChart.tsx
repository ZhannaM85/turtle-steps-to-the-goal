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
  BODY_COMPOSITION_SERIES_KEYS,
  bodyCompositionPoints,
  type BodyCompositionSeriesKey,
} from '@/domain/stats'
import {
  formatExactNumber,
  getDateFnsLocale,
  useLocale,
  useTranslation,
  type Dictionary,
} from '@/i18n'
import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/toggle-group'
import {
  useBodyCompositionSelectionStore,
  useDashboardChartVisibilityStore,
  useTrackedFieldsStore,
} from '@/stores'
import { ChartTitleWithToggle } from './ChartTitleWithToggle'
import { resolveChartClickDate } from './chartNavigation'

// See WeightTrendChart.tsx's identical constant/reasoning (#217).
const MIN_TREND_DATA_POINTS = 3

// Reuses the app's existing 5 chart-color tokens (#53's macro-chart set +
// --chart-weight) rather than defining 5 new ones — already proven legible
// in both light/dark across every mood theme, no new tokens to verify.
const SERIES_COLOR: Record<BodyCompositionSeriesKey, string> = {
  muscleMassKg: 'var(--chart-protein)',
  visceralFatRating: 'var(--chart-fat)',
  bodyWaterPercent: 'var(--chart-weight)',
  boneMassKg: 'var(--chart-carbs)',
  bodyFatPercent: 'var(--chart-calories)',
}

function labelFor(t: Dictionary, key: BodyCompositionSeriesKey): string {
  switch (key) {
    case 'muscleMassKg':
      return t.dailyEntry.muscleMassLabel
    case 'visceralFatRating':
      return t.dailyEntry.visceralFatLabel
    case 'bodyWaterPercent':
      return t.dailyEntry.bodyWaterLabel
    case 'boneMassKg':
      return t.dailyEntry.boneMassLabel
    case 'bodyFatPercent':
      return t.dailyEntry.bodyFatLabel
  }
}

// Visceral fat is an unscaled 1-59 rating, not a physical unit.
function unitFor(t: Dictionary, key: BodyCompositionSeriesKey): string {
  switch (key) {
    case 'muscleMassKg':
    case 'boneMassKg':
      return t.dailyEntry.kgUnit
    case 'bodyWaterPercent':
    case 'bodyFatPercent':
      return t.dailyEntry.percentUnit
    case 'visceralFatRating':
      return ''
  }
}

export interface BodyCompositionTrendChartProps {
  entries: DailyEntry[]
}

/**
 * Trend chart for the 5 body-composition fields (#233's muscle/visceral
 * fat/water/bone, plus body fat % once #263 moved it in here) — captured
 * on the daily entry form but never shown anywhere else until now (#267).
 * Only rendered while `trackedFields.bodyComposition` is on, since the
 * underlying fields are opt-in. Same "trend chart per tracked metric"
 * shape as WeightTrendChart/MacroTrendChart, but plots each series'
 * per-series-normalized 0-100 value (`bodyCompositionPoints`) rather than
 * the raw numbers — these five span kg, %, and an unscaled rating, so
 * sharing one Y-axis on the raw values would flatten the smaller-scale
 * ones to invisible lines next to the larger ones. The tooltip always
 * shows the real logged number, never the normalized plotting coordinate.
 *
 * #277: a `ToggleGroup` (same pattern as `CustomChartView`'s picker) lets
 * the user narrow the 5 series down. With exactly 2 selected, there's no
 * scale-clash risk, so the chart switches to real values on two Y-axes
 * (left/right) instead of the shared normalized-0-100 approach — 1/3/4/5
 * selected keeps that normalized behavior, just for the chosen subset.
 */
export function BodyCompositionTrendChart({
  entries,
}: BodyCompositionTrendChartProps) {
  const t = useTranslation()
  const locale = useLocale()
  const dateFnsLocale = getDateFnsLocale(locale)
  const trackedFields = useTrackedFieldsStore((state) => state.tracked)
  const chartVisible = useDashboardChartVisibilityStore(
    (state) => state.visible.bodyComposition,
  )
  const selected = useBodyCompositionSelectionStore((state) => state.selected)
  const setSelected = useBodyCompositionSelectionStore(
    (state) => state.setSelected,
  )

  if (!trackedFields.bodyComposition) return null

  const points = bodyCompositionPoints(entries)
  const data = points.map((point) => {
    const row: Record<string, string | number | undefined> = {
      date: point.date,
    }
    for (const key of BODY_COMPOSITION_SERIES_KEYS) {
      row[`${key}_norm`] = point.normalized[key]
      row[`${key}_raw`] = point.raw[key]
    }
    return row
  })

  if (data.length === 0) return null

  const chartTitle = (
    <ChartTitleWithToggle
      chart="bodyComposition"
      title={t.dashboard.bodyCompositionTrendTitle}
    />
  )

  if (!chartVisible) {
    return <div className="flex flex-col gap-1.5">{chartTitle}</div>
  }

  if (data.length < MIN_TREND_DATA_POINTS) {
    return (
      <div className="flex flex-col gap-1.5">
        {chartTitle}
        <p className="text-sm text-muted-foreground">
          {t.dashboard.notEnoughTrendDataMessage}
        </p>
      </div>
    )
  }

  const visibleKeys = BODY_COMPOSITION_SERIES_KEYS.filter((key) =>
    selected.includes(key),
  )
  const dualAxis = visibleKeys.length === 2

  const seriesPicker = (
    <ToggleGroup
      type="multiple"
      aria-label={t.dashboard.bodyCompositionTrendTitle}
      value={selected}
      onValueChange={(value: string[]) =>
        setSelected(
          BODY_COMPOSITION_SERIES_KEYS.filter((key) => value.includes(key)),
        )
      }
      className="w-fit flex-wrap"
    >
      {BODY_COMPOSITION_SERIES_KEYS.map((key) => (
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
            {unitFor(t, key)}
          </p>
        ))}
        {date && (
          <Link
            to={`/history?date=${date}`}
            className="mt-1.5 flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
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
      <div className="flex flex-col gap-1.5">
        {chartTitle}
        {seriesPicker}
        <p className="text-sm text-muted-foreground">
          {t.dashboard.bodyCompositionEmptyDescription}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      {chartTitle}
      {seriesPicker}
      <ResponsiveContainer width="100%" height={160}>
        <LineChart
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
            tickFormatter={(date: string) =>
              format(parseISO(date), 'MMM d', { locale: dateFnsLocale })
            }
            axisLine={{ stroke: 'var(--border)' }}
            tickLine={false}
          />
          {dualAxis ? (
            <>
              <YAxis
                yAxisId="left"
                width={40}
                tick={{ fontSize: 11, fill: SERIES_COLOR[visibleKeys[0]] }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                width={40}
                tick={{ fontSize: 11, fill: SERIES_COLOR[visibleKeys[1]] }}
                axisLine={false}
                tickLine={false}
              />
            </>
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
            content={renderTooltip}
            wrapperStyle={{ pointerEvents: 'auto' }}
          />
          {visibleKeys.map((key, index) => (
            <Line
              key={key}
              yAxisId={dualAxis ? (index === 0 ? 'left' : 'right') : undefined}
              type="monotone"
              dataKey={dualAxis ? `${key}_raw` : `${key}_norm`}
              stroke={SERIES_COLOR[key]}
              strokeWidth={2}
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
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
    </div>
  )
}
