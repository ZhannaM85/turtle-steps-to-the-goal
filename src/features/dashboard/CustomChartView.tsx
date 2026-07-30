import type { ReactNode } from 'react'
import { format, parseISO } from 'date-fns'
import { ChartColumn, ChartLine, ChartScatter } from 'lucide-react'
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
import type { DailyEntry } from '@/domain/dailyEntry'
import { kgToLb } from '@/domain/goal'
import {
  booleanFlagDates,
  customChartPoints,
  NUMERIC_SERIES_KEYS,
  resolveMetricValueMap,
  type NumericSeriesKey,
  type Sex,
} from '@/domain/stats'
import {
  formatNumber,
  getDateFnsLocale,
  unitLabel,
  useLocale,
  useTranslation,
  type Dictionary,
} from '@/i18n'
import {
  useCustomChartSelectionStore,
  useCustomMetricStore,
  useCycleTrackingStore,
  useDashboardChartVisibilityStore,
  useDigestionTrackingStore,
  useProfileStore,
  useTrackedFieldsStore,
  useUnitStore,
  type ChartSeriesType,
} from '@/stores'
import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/toggle-group'
import { ChartTitleWithToggle } from './ChartTitleWithToggle'

/** #371 — custom metrics (#336) cycle through this fixed palette by
 * selection order, same "generic reusable slot" precedent steps/waist/
 * hip/bodyFat/fastingHours already established for series with no
 * dedicated color token of their own. Colors can repeat once more than 5
 * custom metrics are selected simultaneously alongside these built-ins —
 * an accepted, pre-existing class of limitation (an unbounded user-defined
 * list can't each get a truly unique color from a fixed palette), not
 * solved here.
 */
const CUSTOM_METRIC_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]

function customMetricColor(index: number): string {
  return CUSTOM_METRIC_COLORS[index % CUSTOM_METRIC_COLORS.length]
}

/** Per-series 0-100 normalization, same logic `customChartSeries.ts`/
 * `bodyCompositionTrend.ts` already use for their own fixed-key sets —
 * kept standalone here since a custom metric's value comes from a
 * `Map<date, number>` (via `resolveMetricValueMap`), not a `DailyEntry`
 * field. */
function normalizeByDate(byDate: Map<string, number>): Map<string, number> {
  const values = [...byDate.values()]
  const normalized = new Map<string, number>()
  if (values.length === 0) return normalized
  const min = Math.min(...values)
  const max = Math.max(...values)
  for (const [date, value] of byDate) {
    normalized.set(date, max === min ? 50 : ((value - min) / (max - min)) * 100)
  }
  return normalized
}

export interface CustomChartViewProps {
  entries: DailyEntry[]
  /** #355 — see `CorrelationViewProps.dragHandle`'s own doc comment. */
  dragHandle?: ReactNode
}

interface BooleanSeriesConfig {
  key: 'onPeriod' | 'hadConstipation' | 'nightEating'
  label: (t: Dictionary, sex?: Sex) => string
  color: string
}

const BOOLEAN_SERIES: BooleanSeriesConfig[] = [
  {
    key: 'onPeriod',
    label: (t) => t.dailyEntry.onPeriodLabel,
    color: 'var(--destructive)',
  },
  {
    key: 'hadConstipation',
    label: (t) => t.dailyEntry.hadConstipationLabel,
    // Matches CalendarView's bg-amber-500 dot for the same flag — no CSS
    // token exists for it, so the raw Tailwind default hex is used as-is.
    color: '#f59e0b',
  },
  {
    key: 'nightEating',
    // #407 — reversing #398's own deliberate scope limit (generic label
    // "regardless of who's viewing"): reported live that the neutral
    // "Ел(а)" placeholder reads badly here too, same as it did in
    // DailyEntryForm/DayDetail before #398.
    label: (t, sex) => t.dailyEntry.nightEatingLabel(sex),
    // Matches CalendarView's bg-indigo-500 dot for the same flag (#383).
    color: '#6366f1',
  },
]

const CHART_TYPE_ICONS: Record<ChartSeriesType, typeof ChartLine> = {
  line: ChartLine,
  bar: ChartColumn,
  dots: ChartScatter,
}

/** Fixed Y position for period/constipation marker dots — pinned to the
 * top of the shared 0-100 normalized range rather than to any series'
 * actual value, since these are on/off flags with no magnitude of their
 * own. */
const BOOLEAN_MARKER_Y = 100

/**
 * Which dashboard/i18n data each numeric series pulls from, plus how to
 * format and unit-label its raw value in the tooltip/legend. Weight is the
 * only unit-aware one (kg/lb via `useUnitStore`); everything else has a
 * fixed unit.
 */
function useNumericSeriesConfig(): Record<
  NumericSeriesKey,
  { label: string; color: string; formatRaw: (value: number) => string }
> {
  const t = useTranslation()
  const locale = useLocale()
  const displayUnit = useUnitStore((state) => state.unit)
  const weightUnit = unitLabel(displayUnit, t)
  const toDisplayWeight = (kg: number) =>
    displayUnit === 'lb' ? kgToLb(kg) : kg

  return {
    weight: {
      label: t.dashboard.customChartWeightLabel,
      color: 'var(--chart-weight)',
      formatRaw: (value) =>
        `${formatNumber(toDisplayWeight(value), locale)} ${weightUnit}`,
    },
    calories: {
      label: t.dashboard.customChartCaloriesLabel,
      color: 'var(--chart-calories)',
      formatRaw: (value) =>
        `${formatNumber(value, locale, 0)} ${t.dailyEntry.kcalUnit}`,
    },
    protein: {
      label: t.dailyEntry.proteinLabel,
      color: 'var(--chart-protein)',
      formatRaw: (value) =>
        `${formatNumber(value, locale, 0)}${t.dailyEntry.gramsUnit}`,
    },
    fat: {
      label: t.dailyEntry.fatLabel,
      color: 'var(--chart-fat)',
      formatRaw: (value) =>
        `${formatNumber(value, locale, 0)}${t.dailyEntry.gramsUnit}`,
    },
    carbs: {
      label: t.dailyEntry.carbsLabel,
      color: 'var(--chart-carbs)',
      formatRaw: (value) =>
        `${formatNumber(value, locale, 0)}${t.dailyEntry.gramsUnit}`,
    },
    // #325: unlike steps/waist/hip/bodyFat/fastingHours below, water has no
    // unused generic --chart-1..5 slot left to borrow (all five are already
    // taken). Reuses --stat-water instead — the mood-independent color
    // already established as water's identity elsewhere in the app (#320's
    // Today progress bar), same reasoning #323 used to give the calories
    // bar --chart-calories directly rather than an unaudited new token.
    water: {
      label: t.dailyEntry.waterLabel,
      color: 'var(--stat-water)',
      formatRaw: (value) =>
        `${formatNumber(value, locale, 0)} ${t.dailyEntry.mlUnit}`,
    },
    // Reuses one of the design system's generic, otherwise-unused chart
    // color slots (--chart-1..5) — steps has no dedicated token of its own
    // the way weight/calories/protein/fat/carbs do.
    steps: {
      label: t.dailyEntry.stepsLabel,
      color: 'var(--chart-1)',
      formatRaw: (value) => formatNumber(value, locale, 0),
    },
    // #440: its own dedicated token, not a reused generic --chart-4/5 slot
    // — see index.css's own comment for why (the #347/#350 bar-mode-reads-
    // black lesson).
    sleep: {
      label: t.dailyEntry.sleepLabel,
      color: 'var(--chart-sleep)',
      formatRaw: (value) => formatNumber(value, locale),
    },
    // #225: also reuse otherwise-unused generic --chart-* slots, same
    // reasoning as steps above — none of these three have a dedicated
    // token the way weight/calories/protein/fat/carbs do.
    waist: {
      label: t.dailyEntry.waistLabel,
      color: 'var(--chart-2)',
      formatRaw: (value) => `${formatNumber(value, locale)}${t.dailyEntry.cmUnit}`,
    },
    hip: {
      label: t.dailyEntry.hipLabel,
      color: 'var(--chart-3)',
      formatRaw: (value) => `${formatNumber(value, locale)}${t.dailyEntry.cmUnit}`,
    },
    // #350: reported live right after validating #347 — bodyFat, switched
    // to bar mode, also rendered black. Same root cause (--chart-4 is the
    // second-darkest of the five achromatic slots); same fix, its own
    // dedicated hued token instead of the shared generic one.
    bodyFat: {
      label: t.dailyEntry.bodyFatLabel,
      color: 'var(--chart-bodyfat)',
      formatRaw: (value) =>
        `${formatNumber(value, locale)}${t.dailyEntry.percentUnit}`,
    },
    // #257 originally reused the last generic --chart-5 slot, same
    // reasoning as steps/waist/hip/bodyFat above. #347: reported live as
    // solid black once switched to bar mode — --chart-5's own lightness
    // is fine for a thin line but reads as black filled solid. Given its
    // own dedicated token instead, same fix every other reported chart-
    // color complaint already got.
    fastingHours: {
      label: t.dashboard.customChartFastingHoursLabel,
      color: 'var(--chart-fasting)',
      formatRaw: (value) => `${formatNumber(value, locale)}h`,
    },
  }
}

/**
 * Customizable Dashboard chart (#132): checkboxes toggle which logged
 * series overlay on one chart, so a user can explore correlations across
 * whatever combination they're curious about, instead of only the fixed
 * pairs the other Dashboard charts show. Weight/calories/macros/steps
 * don't share a Y-axis (kg vs. kcal vs. g vs. step count) — each is
 * normalized to 0-100 within its own range via `customChartPoints`
 * (raw values are what the tooltip and legend show, never the normalized
 * ones) rather than given its own separate axis, which gets unreadable
 * fast past two or three axes on a narrow mobile screen. **#330** is a
 * deliberate, requested exception to that rule for exactly one case:
 * when exactly 2 numeric series are selected, there's no ambiguity about
 * which axis is whose, so those two plot their real (non-normalized)
 * values against two real axes instead — left for the first, right for
 * the second, each formatted in that series' own unit via its existing
 * `formatRaw`, tick color matching the series' own line color as the
 * left/right cue. Any other count (0, 1, or 3+) keeps the original
 * shared-hidden-axis behavior unchanged — 3+ real axes is exactly the
 * "unreadable past two or three" case the normalization exists to avoid.
 * Each numeric
 * series can be plotted as a line, bar, or dots (#137, picked per series
 * in the legend below the chart) — "dots" is a `Line` with a transparent
 * stroke and a visible `dot`, not a `Scatter`, so it shares the same
 * category x-axis as the line/bar series with no extra axis wiring.
 * Period/constipation are on/off flags, not trends, so they always
 * render the same way regardless of the per-series picker: a dot pinned
 * to the top of the chart on each flagged day (same transparent-line
 * trick), replacing an earlier full-height `ReferenceLine` per day (#137)
 * that read as noisier than a simple marker — this now matches the dot
 * visual language `CalendarView` already uses for both (destructive-red
 * / amber dots there, same colors reused here).
 */
export function CustomChartView({ entries, dragHandle }: CustomChartViewProps) {
  const t = useTranslation()
  const locale = useLocale()
  const dateFnsLocale = getDateFnsLocale(locale)
  const seriesConfig = useNumericSeriesConfig()
  const sex = useProfileStore((state) => state.sex)
  const cycleTrackingEnabled = useCycleTrackingStore((state) => state.enabled)
  const digestionTrackingEnabled = useDigestionTrackingStore(
    (state) => state.enabled,
  )
  // #383 — nightEating has no Settings opt-in to gate behind (unlike the
  // other two), so it's always offered.
  const availableBooleanSeries = BOOLEAN_SERIES.filter(
    (series) =>
      (series.key === 'onPeriod' && cycleTrackingEnabled) ||
      (series.key === 'hadConstipation' && digestionTrackingEnabled) ||
      series.key === 'nightEating',
  )
  // #351 — reported live: waist/hip stayed offered here even with "Body
  // measurements" tracking turned off in Settings, unlike the boolean
  // series above (which already gate on their own opt-in trackers).
  // bodyFat gates on "Body composition" instead, not "Body measurements"
  // — DailyEntryForm.tsx moved its own form field into that section back
  // in #263, even though it's still stored on the same DailyEntry as
  // waist/hip. An already-selected key isn't force-removed from
  // `selectedNumeric` if tracking is turned off after the fact — same
  // "only affects what's offered going forward" behavior the boolean
  // series already have.
  const trackedFields = useTrackedFieldsStore((state) => state.tracked)
  const availableNumericKeys = NUMERIC_SERIES_KEYS.filter((key) => {
    if (key === 'waist' || key === 'hip') return trackedFields.bodyMeasurements
    if (key === 'bodyFat') return trackedFields.bodyComposition
    return true
  })

  // #195: persisted across navigation, not local useState — revisiting
  // Dashboard used to silently reset back to the weight+calories/all-lines
  // default every time.
  const selectedNumeric = useCustomChartSelectionStore(
    (state) => state.selectedNumeric,
  )
  const setSelectedNumeric = useCustomChartSelectionStore(
    (state) => state.setSelectedNumeric,
  )
  const selectedBoolean = useCustomChartSelectionStore(
    (state) => state.selectedBoolean,
  )
  const setSelectedBoolean = useCustomChartSelectionStore(
    (state) => state.setSelectedBoolean,
  )
  const selectedCustomMetricIds = useCustomChartSelectionStore(
    (state) => state.selectedCustomMetricIds,
  )
  const setSelectedCustomMetricIds = useCustomChartSelectionStore(
    (state) => state.setSelectedCustomMetricIds,
  )
  const chartTypes = useCustomChartSelectionStore((state) => state.chartTypes)
  const setChartType = useCustomChartSelectionStore(
    (state) => state.setChartType,
  )
  const cardVisible = useDashboardChartVisibilityStore(
    (state) => state.visible.customChart,
  )
  // #371 — DashboardScreen already triggers useCustomMetricStore.loadAll()
  // for CustomCorrelationView, so this just reads whatever's already there.
  const customMetrics = useCustomMetricStore((state) => state.metrics)
  const customMetricEntries = useCustomMetricStore((state) => state.entries)

  if (entries.length === 0) return null

  const cardTitle = (
    <ChartTitleWithToggle
      chart="customChart"
      title={t.dashboard.customChartTitle}
      dragHandle={dragHandle}
    />
  )

  if (!cardVisible) {
    return <div className="flex flex-col gap-3 rounded-lg border border-border p-3">{cardTitle}</div>
  }

  // #330 — real dual axis only when exactly 2 numeric series are picked;
  // see this component's own doc comment above for why. `selectedNumeric`
  // is always in fixed `NUMERIC_SERIES_KEYS` order (set by the toggle
  // group's `onValueChange` below), so left/right stays deterministic
  // regardless of which of the two was actually clicked second.
  const isDualAxis = selectedNumeric.length === 2
  const [leftAxisKey, rightAxisKey] = isDualAxis ? selectedNumeric : []
  // #393 — same "no scale-clash risk" reasoning as isDualAxis, extended to
  // exactly 1 selected numeric series (#348 already established this for
  // BodyCompositionTrendChart.tsx): a lone series gets its own real axis
  // instead of falling through to the shared hidden normalized one, since
  // there's nothing else numeric on screen it could be confused with.
  // Independent of boolean markers/custom metrics being selected alongside
  // it, same as isDualAxis already is — those keep using the always-present
  // "normalized" axis either way.
  const isSingleAxis = selectedNumeric.length === 1
  const soleAxisKey = isSingleAxis ? selectedNumeric[0] : undefined

  const points = customChartPoints(entries, selectedNumeric)
  const pointsByDate = new Map(points.map((p) => [p.date, p]))
  const booleanDatesByKey = new Map(
    selectedBoolean.map((key) => [
      key,
      new Set(
        booleanFlagDates(
          entries,
          key as 'onPeriod' | 'hadConstipation' | 'nightEating',
        ),
      ),
    ]),
  )
  // #371 — resolveMetricValueMap already handles reading a custom metric's
  // own logged entries into a plain date -> value map (same helper #336's
  // custom-correlation engine uses); normalized the same way the built-in
  // series above are.
  const customMetricMaps = selectedCustomMetricIds.map((metricId) => {
    const byDate = resolveMetricValueMap(
      { kind: 'custom', metricId },
      entries,
      customMetricEntries,
    )
    return { metricId, byDate, normalized: normalizeByDate(byDate) }
  })
  // #384 — same root cause and fix as #376's BodyCompositionTrendChart:
  // `points` spans every logged entry's date regardless of which numeric
  // series are actually selected (e.g. years of weight data alongside a
  // steps series that only started last month), so using its full date set
  // stretched the chart across mostly-blank space whenever a selected
  // series' own real data was a narrower recent window than the rest of
  // the history. Narrowed to dates where at least one *currently selected*
  // series — numeric, boolean marker, or custom metric — actually has a
  // value, unioned across all three since (unlike BodyCompositionTrendChart)
  // this chart can mix all three categories at once. A custom metric can be
  // logged on a date with no corresponding DailyEntry at all, so its own
  // dates are still included even though they can't come from `points`.
  const relevantDates = new Set<string>()
  for (const point of points) {
    if (selectedNumeric.some((key) => point.raw[key] !== undefined)) {
      relevantDates.add(point.date)
    }
  }
  for (const key of selectedBoolean) {
    for (const date of booleanDatesByKey.get(key) ?? []) relevantDates.add(date)
  }
  for (const { byDate } of customMetricMaps) {
    for (const date of byDate.keys()) relevantDates.add(date)
  }
  const data = [...relevantDates].sort().map((date) => {
    const point = pointsByDate.get(date)
    const row: Record<string, string | number | undefined> = { date }
    for (const key of selectedNumeric) {
      row[`${key}_norm`] = point?.normalized[key]
      row[`${key}_raw`] = point?.raw[key]
    }
    for (const key of selectedBoolean) {
      row[`${key}_marker`] = booleanDatesByKey.get(key)?.has(date)
        ? BOOLEAN_MARKER_Y
        : undefined
    }
    for (const { metricId, byDate, normalized } of customMetricMaps) {
      row[`${metricId}_raw`] = byDate.get(date)
      row[`${metricId}_norm`] = normalized.get(date)
    }
    return row
  })

  function renderTooltip({ active, label }: TooltipContentProps) {
    if (!active || !label) return null
    const date = String(label)
    const point = pointsByDate.get(date)
    const rows = selectedNumeric.filter((key) => point?.raw[key] !== undefined)
    const customRows = customMetricMaps.filter(({ byDate }) =>
      byDate.has(date),
    )
    if (rows.length === 0 && customRows.length === 0) return null
    return (
      <div
        className="rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md"
        onMouseMove={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        <p className="mb-1 font-medium">
          {format(parseISO(date), 'PP', { locale: dateFnsLocale })}
        </p>
        {rows.map((key) => (
          <p key={key} style={{ color: seriesConfig[key].color }}>
            {seriesConfig[key].label}: {seriesConfig[key].formatRaw(point!.raw[key]!)}
          </p>
        ))}
        {customRows.map(({ metricId, byDate }) => {
          const metric = customMetrics.find((m) => m.id === metricId)
          if (!metric) return null
          const index = selectedCustomMetricIds.indexOf(metricId)
          return (
            <p key={metricId} style={{ color: customMetricColor(index) }}>
              {metric.name}: {formatNumber(byDate.get(date)!, locale)}
              {metric.unit ? ` ${metric.unit}` : ''}
            </p>
          )
        })}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
      {cardTitle}
      <ToggleGroup
        type="multiple"
        aria-label={t.dashboard.customChartTitle}
        value={[...selectedNumeric, ...selectedBoolean, ...selectedCustomMetricIds]}
        onValueChange={(value: string[]) => {
          setSelectedNumeric(
            NUMERIC_SERIES_KEYS.filter((key) => value.includes(key)),
          )
          setSelectedBoolean(
            value.filter((key) =>
              availableBooleanSeries.some((series) => series.key === key),
            ),
          )
          setSelectedCustomMetricIds(
            value.filter((key) => customMetrics.some((metric) => metric.id === key)),
          )
        }}
        className="w-fit flex-wrap"
      >
        {availableNumericKeys.map((key) => (
          <ToggleGroupItem key={key} value={key}>
            {seriesConfig[key].label}
          </ToggleGroupItem>
        ))}
        {availableBooleanSeries.map((series) => (
          <ToggleGroupItem key={series.key} value={series.key}>
            {series.label(t, sex)}
          </ToggleGroupItem>
        ))}
        {/* #371 — custom metrics (#336), same chip pattern as the built-ins
         * above. */}
        {customMetrics.map((metric) => (
          <ToggleGroupItem key={metric.id} value={metric.id}>
            {metric.name}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {selectedNumeric.length === 0 && selectedCustomMetricIds.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t.dashboard.customChartEmptyDescription}
        </p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                // #444 follow-up — reported live right after fixing the
                // right-axis overflow: with both y-axes now actually
                // rendering (taking up real width on both sides), the
                // previous 'PP' format ("8 июл. 2026 г.") was too wide for
                // the shrunk plot area and overlapped between ticks. A
                // fixed numeric dd.MM.yy ("16.07.26") is short enough to
                // fit and, unlike 'PP', has no locale-dependent month name
                // to translate, so it doesn't need date-fns' locale option.
                tickFormatter={(date: string) => format(parseISO(date), 'dd.MM.yy')}
                axisLine={{ stroke: 'var(--border)' }}
                tickLine={false}
              />
              {/* #393 — reported live: no y-axis at all with exactly 1
               * numeric series selected, confirmed via a real seeded
               * Playwright run (not just jsdom, where this axis renders no
               * SVG internals at all) that the "single" axis below was
               * rendering with negative x-coordinates, off-canvas to the
               * left of the SVG. Root cause: this hidden axis defaults to
               * `orientation="left"` same as "single" — two same-side
               * y-axes (even though this one is invisible) confuses
               * Recharts' `width="auto"` margin-expansion measurement,
               * which only misbehaves in the exactly-1-series case (the
               * dual-axis "left"/"right" pair above never shares a side
               * with this one). Explicitly moving this hidden axis to the
               * *other* side is enough to stop it competing with "single"
               * for left-side margin space — verified live afterward: the
               * axis renders with positive coordinates, and the dual-axis
               * pair + boolean-marker dots (which also use this same
               * `yAxisId="normalized"`) are unaffected, since orientation
               * only changes which side a (here, invisible) axis's own
               * labels would draw on, not the underlying data mapping. */}
              <YAxis
                yAxisId="normalized"
                orientation="right"
                width={0}
                domain={[0, 100]}
                hide
              />
              {isDualAxis && (
                <>
                  <YAxis
                    yAxisId="left"
                    orientation="left"
                    // #444 — was `width="auto"`. The always-present hidden
                    // `normalized` axis above is `orientation="right"`, same
                    // as this dual-axis pair's own "right" key below — two
                    // same-side axes confuse Recharts' `width="auto"`
                    // margin-auto-expansion measurement, the identical bug
                    // class #393 already found (there, for the single-axis
                    // case). A fixed pixel width sidesteps that measurement
                    // entirely, same fix `BodyCompositionTrendChart.tsx`'s
                    // own dual axis already uses for exactly this reason.
                    width={40}
                    domain={['auto', 'auto']}
                    tick={{ fontSize: 11, fill: seriesConfig[leftAxisKey!].color }}
                    tickFormatter={(value: number) =>
                      seriesConfig[leftAxisKey!].formatRaw(value)
                    }
                    axisLine={{ stroke: seriesConfig[leftAxisKey!].color }}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    width={40}
                    domain={['auto', 'auto']}
                    tick={{ fontSize: 11, fill: seriesConfig[rightAxisKey!].color }}
                    tickFormatter={(value: number) =>
                      seriesConfig[rightAxisKey!].formatRaw(value)
                    }
                    axisLine={{ stroke: seriesConfig[rightAxisKey!].color }}
                    tickLine={false}
                  />
                </>
              )}
              {isSingleAxis && (
                <YAxis
                  yAxisId="single"
                  orientation="left"
                  width={40}
                  domain={['auto', 'auto']}
                  tick={{ fontSize: 11, fill: seriesConfig[soleAxisKey!].color }}
                  tickFormatter={(value: number) =>
                    seriesConfig[soleAxisKey!].formatRaw(value)
                  }
                  axisLine={{ stroke: seriesConfig[soleAxisKey!].color }}
                  tickLine={false}
                />
              )}
              <Tooltip content={renderTooltip} wrapperStyle={{ pointerEvents: 'auto' }} />
              {selectedBoolean.map((seriesKey) => {
                const series = availableBooleanSeries.find(
                  (s) => s.key === seriesKey,
                )
                if (!series) return null
                return (
                  <Line
                    key={series.key}
                    yAxisId="normalized"
                    type="monotone"
                    dataKey={`${series.key}_marker`}
                    stroke="transparent"
                    dot={{ r: 4, fill: series.color, strokeWidth: 0 }}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                )
              })}
              {selectedNumeric.map((key) => {
                const chartType = chartTypes[key]
                // #330/#393 — plot the real value against that series' own
                // real axis when exactly 2, or exactly 1, series are
                // selected, instead of the shared normalized 0-100 one
                // every other count still uses.
                const dataKey =
                  isDualAxis || isSingleAxis ? `${key}_raw` : `${key}_norm`
                const yAxisId = isDualAxis
                  ? key === leftAxisKey
                    ? 'left'
                    : 'right'
                  : isSingleAxis
                    ? 'single'
                    : 'normalized'
                if (chartType === 'bar') {
                  return (
                    <Bar
                      key={key}
                      yAxisId={yAxisId}
                      dataKey={dataKey}
                      fill={seriesConfig[key].color}
                      radius={[2, 2, 0, 0]}
                      maxBarSize={14}
                      // #198: a day whose value happens to be the visible
                      // range's minimum normalizes to 0 and renders as no
                      // bar at all — reads as "nothing logged" even though
                      // there's a real, just relatively low, value (found
                      // from a report that a day with 918 logged kcal, only
                      // modestly below its neighbors, looked empty on the
                      // calories bar chart). minPointSize keeps every bar
                      // at least a few px tall so it stays visibly present;
                      // the tooltip/legend still always read the real
                      // number from `raw`, never this rendered height.
                      minPointSize={3}
                      isAnimationActive={false}
                    />
                  )
                }
                if (chartType === 'dots') {
                  return (
                    <Line
                      key={key}
                      yAxisId={yAxisId}
                      type="monotone"
                      dataKey={dataKey}
                      stroke="transparent"
                      dot={{ r: 3, fill: seriesConfig[key].color, strokeWidth: 0 }}
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
                    stroke={seriesConfig[key].color}
                    strokeWidth={2}
                    dot={false}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                )
              })}
              {/* #371 — always plotted on the shared normalized axis,
               * regardless of isDualAxis/isSingleAxis: an unbounded
               * user-defined list doesn't fit the fixed-key dual/single
               * real-axis logic above, a deliberate v1 scope trim. #391 —
               * that trim was only ever about axis assignment, not chart
               * type: line/bar/dots is purely a rendering choice, so it
               * extends the same per-key toggle built-in series already
               * have. */}
              {selectedCustomMetricIds.map((metricId, index) => {
                const chartType = chartTypes[metricId] ?? 'line'
                const color = customMetricColor(index)
                if (chartType === 'bar') {
                  return (
                    <Bar
                      key={metricId}
                      yAxisId="normalized"
                      dataKey={`${metricId}_norm`}
                      fill={color}
                      radius={[2, 2, 0, 0]}
                      maxBarSize={14}
                      minPointSize={3}
                      isAnimationActive={false}
                    />
                  )
                }
                if (chartType === 'dots') {
                  return (
                    <Line
                      key={metricId}
                      yAxisId="normalized"
                      type="monotone"
                      dataKey={`${metricId}_norm`}
                      stroke="transparent"
                      dot={{ r: 3, fill: color, strokeWidth: 0 }}
                      connectNulls={false}
                      isAnimationActive={false}
                    />
                  )
                }
                return (
                  <Line
                    key={metricId}
                    yAxisId="normalized"
                    type="monotone"
                    dataKey={`${metricId}_norm`}
                    stroke={color}
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
            {selectedNumeric.map((key) => (
              <div key={key} className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="size-2 rounded-sm"
                  style={{ background: seriesConfig[key].color }}
                />
                {seriesConfig[key].label}
                <ToggleGroup
                  type="single"
                  aria-label={t.dashboard.customChartTypeGroupLabel(
                    seriesConfig[key].label,
                  )}
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
            {selectedBoolean.map((seriesKey) => {
              const series = availableBooleanSeries.find(
                (s) => s.key === seriesKey,
              )
              if (!series) return null
              return (
                <div key={series.key} className="flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className="size-2 rounded-full"
                    style={{ background: series.color }}
                  />
                  {series.label(t, sex)}
                </div>
              )
            })}
            {selectedCustomMetricIds.map((metricId, index) => {
              const metric = customMetrics.find((m) => m.id === metricId)
              if (!metric) return null
              return (
                <div key={metricId} className="flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className="size-2 rounded-sm"
                    style={{ background: customMetricColor(index) }}
                  />
                  {metric.name}
                  <ToggleGroup
                    type="single"
                    aria-label={t.dashboard.customChartTypeGroupLabel(
                      metric.name,
                    )}
                    value={chartTypes[metricId] ?? 'line'}
                    onValueChange={(value) => {
                      if (!value) return
                      setChartType(metricId, value as ChartSeriesType)
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
              )
            })}
          </div>
          {/* #330 — this caveat describes the normalized-scale behavior,
           * which no longer applies once exactly 2 series switch to real
           * dual axes above; showing it then would contradict what's
           * actually on screen. #393 — same for the exactly-1 single-axis
           * case. #371 — a selected custom metric always plots on the
           * normalized axis regardless of isDualAxis/isSingleAxis, so the
           * caveat still applies whenever one is selected, even alongside
           * an active real-axis series. */}
          {((!isDualAxis && !isSingleAxis) ||
            selectedCustomMetricIds.length > 0) && (
            <p className="text-xs text-muted-foreground">
              {t.dashboard.customChartNormalizedCaveat}
            </p>
          )}
        </>
      )}
    </div>
  )
}
