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
  type NumericSeriesKey,
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
  useCycleTrackingStore,
  useDashboardChartVisibilityStore,
  useDigestionTrackingStore,
  useUnitStore,
  type ChartSeriesType,
} from '@/stores'
import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/toggle-group'
import { ChartTitleWithToggle } from './ChartTitleWithToggle'

export interface CustomChartViewProps {
  entries: DailyEntry[]
}

interface BooleanSeriesConfig {
  key: 'onPeriod' | 'hadConstipation'
  label: (t: Dictionary) => string
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
    bodyFat: {
      label: t.dailyEntry.bodyFatLabel,
      color: 'var(--chart-4)',
      formatRaw: (value) =>
        `${formatNumber(value, locale)}${t.dailyEntry.percentUnit}`,
    },
    // #257 — last remaining generic --chart-* slot, same reasoning as
    // steps/waist/hip/bodyFat above.
    fastingHours: {
      label: t.dashboard.fastingHoursLegend,
      color: 'var(--chart-5)',
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
export function CustomChartView({ entries }: CustomChartViewProps) {
  const t = useTranslation()
  const locale = useLocale()
  const dateFnsLocale = getDateFnsLocale(locale)
  const seriesConfig = useNumericSeriesConfig()
  const cycleTrackingEnabled = useCycleTrackingStore((state) => state.enabled)
  const digestionTrackingEnabled = useDigestionTrackingStore(
    (state) => state.enabled,
  )
  const availableBooleanSeries = BOOLEAN_SERIES.filter(
    (series) =>
      (series.key === 'onPeriod' && cycleTrackingEnabled) ||
      (series.key === 'hadConstipation' && digestionTrackingEnabled),
  )

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
  const chartTypes = useCustomChartSelectionStore((state) => state.chartTypes)
  const setChartType = useCustomChartSelectionStore(
    (state) => state.setChartType,
  )
  const cardVisible = useDashboardChartVisibilityStore(
    (state) => state.visible.customChart,
  )

  if (entries.length === 0) return null

  const cardTitle = (
    <ChartTitleWithToggle chart="customChart" title={t.dashboard.customChartTitle} />
  )

  if (!cardVisible) {
    return <div className="flex flex-col gap-3">{cardTitle}</div>
  }

  // #330 — real dual axis only when exactly 2 numeric series are picked;
  // see this component's own doc comment above for why. `selectedNumeric`
  // is always in fixed `NUMERIC_SERIES_KEYS` order (set by the toggle
  // group's `onValueChange` below), so left/right stays deterministic
  // regardless of which of the two was actually clicked second.
  const isDualAxis = selectedNumeric.length === 2
  const [leftAxisKey, rightAxisKey] = isDualAxis ? selectedNumeric : []

  const points = customChartPoints(entries, selectedNumeric)
  const booleanDatesByKey = new Map(
    selectedBoolean.map((key) => [
      key,
      new Set(booleanFlagDates(entries, key as 'onPeriod' | 'hadConstipation')),
    ]),
  )
  const data = points.map((point) => {
    const row: Record<string, string | number | undefined> = { date: point.date }
    for (const key of selectedNumeric) {
      row[`${key}_norm`] = point.normalized[key]
      row[`${key}_raw`] = point.raw[key]
    }
    for (const key of selectedBoolean) {
      row[`${key}_marker`] = booleanDatesByKey.get(key)?.has(point.date)
        ? BOOLEAN_MARKER_Y
        : undefined
    }
    return row
  })

  function renderTooltip({ active, label }: TooltipContentProps) {
    if (!active || !label) return null
    const point = points.find((p) => p.date === label)
    if (!point) return null
    const rows = selectedNumeric.filter((key) => point.raw[key] !== undefined)
    if (rows.length === 0) return null
    return (
      <div
        className="rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md"
        onMouseMove={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        <p className="mb-1 font-medium">
          {format(parseISO(String(label)), 'PP', { locale: dateFnsLocale })}
        </p>
        {rows.map((key) => (
          <p key={key} style={{ color: seriesConfig[key].color }}>
            {seriesConfig[key].label}: {seriesConfig[key].formatRaw(point.raw[key]!)}
          </p>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {cardTitle}
      <ToggleGroup
        type="multiple"
        aria-label={t.dashboard.customChartTitle}
        value={[...selectedNumeric, ...selectedBoolean]}
        onValueChange={(value: string[]) => {
          setSelectedNumeric(
            NUMERIC_SERIES_KEYS.filter((key) => value.includes(key)),
          )
          setSelectedBoolean(
            value.filter((key) =>
              availableBooleanSeries.some((series) => series.key === key),
            ),
          )
        }}
        className="w-fit flex-wrap"
      >
        {NUMERIC_SERIES_KEYS.map((key) => (
          <ToggleGroupItem key={key} value={key}>
            {seriesConfig[key].label}
          </ToggleGroupItem>
        ))}
        {availableBooleanSeries.map((series) => (
          <ToggleGroupItem key={series.key} value={series.key}>
            {series.label(t)}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {selectedNumeric.length === 0 ? (
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
                tickFormatter={(date: string) =>
                  format(parseISO(date), 'MMM d', { locale: dateFnsLocale })
                }
                axisLine={{ stroke: 'var(--border)' }}
                tickLine={false}
              />
              <YAxis yAxisId="normalized" domain={[0, 100]} hide />
              {isDualAxis && (
                <>
                  <YAxis
                    yAxisId="left"
                    orientation="left"
                    width="auto"
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
                    width="auto"
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
                // #330 — plot the real value against that series' own real
                // axis when exactly 2 series are selected, instead of the
                // shared normalized 0-100 one every other count still uses.
                const dataKey = isDualAxis ? `${key}_raw` : `${key}_norm`
                const yAxisId = isDualAxis
                  ? key === leftAxisKey
                    ? 'left'
                    : 'right'
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
                  {series.label(t)}
                </div>
              )
            })}
          </div>
          {/* #330 — this caveat describes the normalized-scale behavior,
           * which no longer applies once exactly 2 series switch to real
           * dual axes above; showing it then would contradict what's
           * actually on screen. */}
          {!isDualAxis && (
            <p className="text-xs text-muted-foreground">
              {t.dashboard.customChartNormalizedCaveat}
            </p>
          )}
        </>
      )}
    </div>
  )
}
