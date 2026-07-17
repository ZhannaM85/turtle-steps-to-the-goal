import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
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
import { useCycleTrackingStore, useDigestionTrackingStore, useUnitStore } from '@/stores'
import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/toggle-group'

export interface CustomChartViewProps {
  entries: DailyEntry[]
}

interface BooleanSeriesConfig {
  key: 'onPeriod' | 'hadBowelMovement'
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
    key: 'hadBowelMovement',
    label: (t) => t.dailyEntry.hadBowelMovementLabel,
    // Matches CalendarView's bg-amber-500 dot for the same flag — no CSS
    // token exists for it, so the raw Tailwind default hex is used as-is.
    color: '#f59e0b',
  },
]

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
    // Reuses one of the design system's generic, otherwise-unused chart
    // color slots (--chart-1..5) — steps has no dedicated token of its own
    // the way weight/calories/protein/fat/carbs do.
    steps: {
      label: t.dailyEntry.stepsLabel,
      color: 'var(--chart-1)',
      formatRaw: (value) => formatNumber(value, locale, 0),
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
 * fast past two or three axes on a narrow mobile screen. Period/bowel
 * movement are on/off flags, not trends, so they render as vertical
 * marker lines (`ReferenceLine`) instead of a plotted line, the same
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
      (series.key === 'hadBowelMovement' && digestionTrackingEnabled),
  )

  const [selectedNumeric, setSelectedNumeric] = useState<NumericSeriesKey[]>([
    'weight',
    'calories',
  ])
  const [selectedBoolean, setSelectedBoolean] = useState<string[]>([])

  if (entries.length === 0) return null

  const points = customChartPoints(entries, selectedNumeric)
  const data = points.map((point) => {
    const row: Record<string, string | number | undefined> = { date: point.date }
    for (const key of selectedNumeric) {
      row[`${key}_norm`] = point.normalized[key]
      row[`${key}_raw`] = point.raw[key]
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
      <h2 className="text-sm font-medium text-muted-foreground">
        {t.dashboard.customChartTitle}
      </h2>
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
            <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
              <YAxis domain={[0, 100]} hide />
              <Tooltip content={renderTooltip} wrapperStyle={{ pointerEvents: 'auto' }} />
              {selectedBoolean.flatMap((seriesKey) => {
                const series = availableBooleanSeries.find(
                  (s) => s.key === seriesKey,
                )
                if (!series) return []
                const flagKey = series.key as 'onPeriod' | 'hadBowelMovement'
                return booleanFlagDates(entries, flagKey).map((date) => (
                  <ReferenceLine
                    key={`${series.key}-${date}`}
                    x={date}
                    stroke={series.color}
                    strokeWidth={2}
                    strokeOpacity={0.5}
                    ifOverflow="visible"
                  />
                ))
              })}
              {selectedNumeric.map((key) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={`${key}_norm`}
                  stroke={seriesConfig[key].color}
                  strokeWidth={2}
                  dot={false}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
          <span className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {selectedNumeric.map((key) => (
              <i key={key} className="flex items-center gap-1 not-italic">
                <span
                  aria-hidden="true"
                  className="size-2 rounded-sm"
                  style={{ background: seriesConfig[key].color }}
                />
                {seriesConfig[key].label}
              </i>
            ))}
            {selectedBoolean.map((seriesKey) => {
              const series = availableBooleanSeries.find(
                (s) => s.key === seriesKey,
              )
              if (!series) return null
              return (
                <i key={series.key} className="flex items-center gap-1 not-italic">
                  <span
                    aria-hidden="true"
                    className="size-2 rounded-full"
                    style={{ background: series.color }}
                  />
                  {series.label(t)}
                </i>
              )
            })}
          </span>
          <p className="text-xs text-muted-foreground">
            {t.dashboard.customChartNormalizedCaveat}
          </p>
        </>
      )}
    </div>
  )
}
