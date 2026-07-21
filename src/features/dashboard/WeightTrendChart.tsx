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
  type DotItemDotProps,
  type TooltipContentProps,
} from 'recharts'
import { Link } from 'react-router-dom'
import type { DailyEntry } from '@/domain/dailyEntry'
import { kgToLb } from '@/domain/goal'
import { rollingAverage } from '@/domain/stats'
import {
  formatNumber,
  getDateFnsLocale,
  unitLabel,
  useLocale,
  useTranslation,
} from '@/i18n'
import { useTrendChartSeriesStore, useUnitStore } from '@/stores'
import { resolveChartClickDate } from './chartNavigation'

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
  entries: DailyEntry[]
}

export function WeightTrendChart({ entries }: WeightTrendChartProps) {
  const t = useTranslation()
  const locale = useLocale()
  const dateFnsLocale = getDateFnsLocale(locale)
  const displayUnit = useUnitStore((state) => state.unit)
  const toDisplay = (kg: number) => (displayUnit === 'lb' ? kgToLb(kg) : kg)
  // #238 — independent per chart, someone might want the average on one
  // trend chart and not the other.
  const visible = useTrendChartSeriesStore((state) => state.visible.weight)
  const toggleSeries = useTrendChartSeriesStore((state) => state.toggleSeries)

  const weightPoints = entries
    .filter(
      (entry): entry is DailyEntry & { weightKg: number } =>
        entry.weightKg !== undefined,
    )
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((entry) => ({ date: entry.date, weight: toDisplay(entry.weightKg) }))

  if (weightPoints.length === 0) return null

  if (weightPoints.length < MIN_TREND_DATA_POINTS) {
    return (
      <p className="text-sm text-muted-foreground">
        {t.dashboard.notEnoughTrendDataMessage}
      </p>
    )
  }

  if (!visible.raw && !visible.average) {
    return (
      <p className="text-sm text-muted-foreground">
        {t.dashboard.trendChartEmptyDescription}
      </p>
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

  // The special "current value" dot (below) marks the most recent day
  // that actually has a logged weight — not just the last row in `data`,
  // which can trail off with average-only points on days that logged
  // something else but no weight (rollingAverage() covers every entry
  // date, not only weight-logged ones).
  const lastWeightDate = weightPoints[weightPoints.length - 1].date
  const lastWeightIndex = data.findIndex((point) => point.date === lastWeightDate)

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

  return (
    <div className="flex flex-col gap-1.5">
      <ResponsiveContainer width="100%" height={180}>
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
          <YAxis
            width={40}
            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
            axisLine={false}
            tickLine={false}
            domain={['auto', 'auto']}
          />
          <Tooltip
            content={renderTooltip}
            wrapperStyle={{ pointerEvents: 'auto' }}
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
                if (index !== lastWeightIndex || cx == null || cy == null) {
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
      {/* #238: legend doubles as a show/hide toggle per series — was purely
       * decorative before, no way to turn either off. */}
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
      <p className="text-xs text-muted-foreground">
        {t.dashboard.chartNavigationHint}
      </p>
    </div>
  )
}
