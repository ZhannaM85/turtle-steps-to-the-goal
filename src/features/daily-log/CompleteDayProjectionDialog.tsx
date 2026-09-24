import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import {
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts'
import { totalCalories } from '@/domain/dailyEntry'
import { kgToLb } from '@/domain/goal'
import {
  COMPLETE_DAY_DEFAULT_HORIZON,
  COMPLETE_DAY_HORIZONS,
  completeDayAxisTickLabel,
  completeDayHorizonWeeks,
  completeDayLabeledWeekTicks,
  completeDayProjectionBlocker,
  completeDayWeekGridTicks,
  completeDayWeightAxisTicks,
  projectWeightIfEatingLikeToday,
  type CompleteDayHorizon,
} from '@/domain/stats'
import {
  formatExactNumber,
  formatLocalizedDate,
  formatNumber,
  unitLabel,
  useLocale,
} from '@/i18n'
import { formatKcal } from '@/shared/lib/macroDisplay'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/shared/ui/dialog'
import {
  PeriodToggleGroup,
  PeriodToggleGroupItem,
} from '@/shared/ui/toggle-group'
import { useProfileStore, useUnitStore } from '@/stores'
import { useDailyEntryFormStateContext } from './useDailyEntryFormStateContext'

/** #938/#953 — date-only labels sit under the dashed vertical grid. */
export function CompleteDayWeekTick({
  x,
  y,
  payload,
  endWeek,
  formatTick,
}: {
  x?: number
  y?: number
  payload?: { value?: number }
  endWeek: number
  formatTick: (week: number) => string
}) {
  const week = payload?.value
  if (week === undefined || x === undefined || y === undefined) return null
  const label = formatTick(week)
  if (!label) return null
  const isStart = Math.abs(week) < 1e-6
  const isEnd = Math.abs(week - endWeek) < 1e-6
  return (
    <text
      x={x}
      y={y}
      dy={14}
      textAnchor={isStart ? 'start' : isEnd ? 'end' : 'middle'}
      fontSize={11}
      fill="var(--muted-foreground)"
    >
      {label}
    </text>
  )
}

/**
 * #951 — Pond `--card` === `--muted`, so Export's muted track only reads on
 * the Settings page fill. This fullscreen sheet uses the same fill.
 */
export const COMPLETE_DAY_PROJECTION_DIALOG_CLASS = 'bg-background'

/** #955 — compact sheet so Year fits one typical iPhone viewport without scroll. */
export const COMPLETE_DAY_PROJECTION_SHEET_CLASS = 'mt-3 flex flex-col gap-3'
export const COMPLETE_DAY_PROJECTION_CHART_CLASS = 'h-56 w-full'
export const COMPLETE_DAY_PROJECTION_ESTIMATE_ROW_CLASS =
  'flex items-end justify-between gap-2'
export const COMPLETE_DAY_PROJECTION_ESTIMATE_VALUE_CLASS =
  'text-xl font-semibold'

/** #947 — line samples, not identical solid dots. */
function CompleteDayLegendLineSample({
  series,
}: {
  series: 'weight' | 'average'
}) {
  return (
    <svg
      data-legend-series={series}
      width="18"
      height="8"
      viewBox="0 0 18 8"
      aria-hidden="true"
      className="shrink-0"
    >
      <line
        x1="0"
        y1="4"
        x2="18"
        y2="4"
        stroke={
          series === 'weight'
            ? 'var(--chart-weight)'
            : 'var(--muted-foreground)'
        }
        strokeWidth={series === 'weight' ? 2.5 : 1.5}
        strokeDasharray={series === 'average' ? '4 3' : undefined}
        strokeLinecap="round"
      />
    </svg>
  )
}

/**
 * #934 — Day CTA + full-height sheet: if days like today became the usual
 * pattern, where weight might be over the selected Week / Month / Year.
 * Close with the X only.
 * #944 — outline chrome (beige fill, thin border, dark text) so the
 * full-width CTA is not a solid olive block.
 * #948 / #951 — Week/Month/Year uses the shared Export period
 * `PeriodToggleGroup` (muted track, card pill, shadow, 48px type).
 */
export function CompleteDayProjectionDialog() {
  const state = useDailyEntryFormStateContext()
  const { t } = state
  const locale = useLocale()
  const unit = useUnitStore((s) => s.unit)
  const heightCm = useProfileStore((s) => s.heightCm)
  const age = useProfileStore((s) => s.age)
  const sex = useProfileStore((s) => s.sex)
  const activityLevel = useProfileStore((s) => s.activityLevel)
  const [open, setOpen] = useState(false)
  const [horizon, setHorizon] = useState<CompleteDayHorizon>(
    COMPLETE_DAY_DEFAULT_HORIZON,
  )
  const endWeek = completeDayHorizonWeeks(horizon)

  const dailyKcal = totalCalories(state.calorieEntries, state.dayTotals)
  const blocker = completeDayProjectionBlocker({
    weightKg: state.weightKg,
    dailyKcal,
    heightCm,
    age,
    sex,
    activityLevel,
  })
  const projection =
    blocker === undefined &&
    state.weightKg !== undefined &&
    dailyKcal !== undefined &&
    heightCm !== undefined &&
    age !== undefined &&
    sex !== undefined &&
    activityLevel !== undefined
      ? projectWeightIfEatingLikeToday({
          weightKg: state.weightKg,
          dailyKcal,
          heightCm,
          age,
          sex,
          activityLevel,
          logDate: state.date,
          horizon,
        })
      : null

  const toDisplay = (kg: number) => (unit === 'lb' ? kgToLb(kg) : kg)
  const unitText = unitLabel(unit, t)
  const chartData =
    projection?.chartPoints.map((point) => ({
      week: point.week,
      weight: toDisplay(point.weightKg),
      average: toDisplay(point.averageKg),
    })) ?? []
  const weekTicks = completeDayWeekGridTicks(horizon)
  const labeledWeekTicks = completeDayLabeledWeekTicks(
    horizon,
    state.date,
    (iso) => formatLocalizedDate(iso, locale),
  )
  const formatXTick = (week: number) =>
    completeDayAxisTickLabel(week, state.date, (iso) =>
      formatLocalizedDate(iso, locale),
    )
  const displayWeights = chartData.flatMap((point) => [
    point.weight,
    point.average,
  ])
  // #954 — full-width horizontal dashed grid at the labeled Y ticks
  // (500 g on Week/Month; thinned on Year so lines stay readable).
  const weightAxisTicks =
    displayWeights.length > 0
      ? completeDayWeightAxisTicks(
          Math.min(...displayWeights),
          Math.max(...displayWeights),
        )
      : []

  const changeText = (totalChangeKg: number) => {
    const amount = `${formatNumber(Math.abs(toDisplay(totalChangeKg)), locale)} ${unitText}`
    if (Math.abs(totalChangeKg) < 0.05)
      return t.today.completeDayChangeSame(horizon)
    if (totalChangeKg > 0)
      return t.today.completeDayChangeLower(amount, horizon)
    return t.today.completeDayChangeHigher(amount, horizon)
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="xl"
        className="w-full"
        onClick={() => setOpen(true)}
      >
        {t.today.completeDayButton}
        <ArrowRight aria-hidden="true" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          size="fullscreen"
          className={COMPLETE_DAY_PROJECTION_DIALOG_CLASS}
          closeLabel={t.today.celebrationCloseLabel}
        >
          <DialogTitle className="pr-10 text-xl leading-snug">
            {t.today.completeDayTitle}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t.today.completeDayDisclaimer}
          </DialogDescription>
          {blocker === 'missingWeight' && (
            <p className="mt-4 text-sm">{t.today.completeDayMissingWeight}</p>
          )}
          {blocker === 'missingCalories' && (
            <p className="mt-4 text-sm">{t.today.completeDayMissingCalories}</p>
          )}
          {blocker === 'unusualLow' && (
            <p className="mt-4 text-sm">{t.today.completeDayUnusualLow}</p>
          )}
          {blocker === 'unusualHigh' && (
            <p className="mt-4 text-sm">{t.today.completeDayUnusualHigh}</p>
          )}
          {blocker === 'missingProfile' && (
            <p className="mt-4 text-sm">
              {t.today.completeDayMissingProfile}{' '}
              <Link
                to="/settings"
                className="text-primary underline-offset-4 hover:underline"
                onClick={() => setOpen(false)}
              >
                {t.today.completeDayProfileLink}
              </Link>
            </p>
          )}
          {projection && state.weightKg !== undefined && (
            <div
              data-complete-day-sheet
              className={COMPLETE_DAY_PROJECTION_SHEET_CLASS}
            >
              <div className="flex items-baseline gap-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t.today.completeDayTodayLabel}
                </p>
                <p className="text-lg font-semibold">
                  {formatNumber(toDisplay(state.weightKg), locale)} {unitText}
                </p>
              </div>
              <PeriodToggleGroup
                type="single"
                aria-label={t.today.completeDayHorizonLabel}
                value={horizon}
                onValueChange={(value) => {
                  if (
                    value === 'week' ||
                    value === 'month' ||
                    value === 'year'
                  ) {
                    setHorizon(value)
                  }
                }}
              >
                {COMPLETE_DAY_HORIZONS.map((id) => (
                  <PeriodToggleGroupItem key={id} value={id}>
                    {
                      {
                        week: t.export.exportRangeWeek,
                        month: t.export.exportRangeMonth,
                        year: t.export.exportRangeYear,
                      }[id]
                    }
                  </PeriodToggleGroupItem>
                ))}
              </PeriodToggleGroup>
              <div
                data-complete-day-chart
                className={COMPLETE_DAY_PROJECTION_CHART_CLASS}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 12, right: 8, left: 0, bottom: 8 }}
                  >
                    {weekTicks.map((week) => (
                      <ReferenceLine
                        key={`week-${week}`}
                        x={week}
                        stroke="var(--muted-foreground)"
                        strokeOpacity={0.35}
                        strokeDasharray="5 4"
                        strokeWidth={1}
                      />
                    ))}
                    {weightAxisTicks.map((weight) => (
                      <ReferenceLine
                        key={`kg-${weight}`}
                        y={weight}
                        stroke="var(--muted-foreground)"
                        strokeOpacity={0.35}
                        strokeDasharray="5 4"
                        strokeWidth={1}
                      />
                    ))}
                    {/* #953/#957/#959 — PP dates at a non-overlapping subset
                     * of the vertical grid (Month/Year keep start+mid+end). */}
                    <XAxis
                      dataKey="week"
                      type="number"
                      domain={[0, endWeek]}
                      ticks={labeledWeekTicks}
                      interval={0}
                      minTickGap={0}
                      tick={
                        <CompleteDayWeekTick
                          endWeek={endWeek}
                          formatTick={formatXTick}
                        />
                      }
                      axisLine={{ stroke: 'var(--border)' }}
                      tickLine={{ stroke: 'var(--muted-foreground)' }}
                      height={28}
                    />
                    <YAxis
                      type="number"
                      domain={
                        weightAxisTicks.length > 1
                          ? [
                              weightAxisTicks[0]!,
                              weightAxisTicks[weightAxisTicks.length - 1]!,
                            ]
                          : ['auto', 'auto']
                      }
                      ticks={weightAxisTicks}
                      interval={0}
                      tick={{
                        fontSize: 11,
                        fill: 'var(--muted-foreground)',
                      }}
                      tickFormatter={(value: number) =>
                        formatExactNumber(value, locale)
                      }
                      axisLine={false}
                      tickLine={{ stroke: 'var(--muted-foreground)' }}
                      width={40}
                    />
                    <Line
                      type="linear"
                      dataKey="weight"
                      stroke="var(--chart-weight)"
                      strokeWidth={2.5}
                      connectNulls={false}
                      isAnimationActive={false}
                      activeDot={false}
                      dot={(props) => {
                        const week = (props as { payload?: { week?: number } })
                          .payload?.week
                        if (week !== 0 && week !== endWeek) {
                          return false
                        }
                        const { cx, cy, index } = props as {
                          cx?: number
                          cy?: number
                          index?: number
                        }
                        return (
                          <circle
                            key={index}
                            cx={cx}
                            cy={cy}
                            r={5}
                            fill="var(--chart-weight)"
                          />
                        )
                      }}
                    />
                    {/* #946/#947/#950: dashed muted companion — 7-day
                     * average through the oscillating daily series. */}
                    <Line
                      type="monotone"
                      dataKey="average"
                      stroke="var(--muted-foreground)"
                      strokeWidth={1.5}
                      strokeDasharray="4 3"
                      dot={false}
                      connectNulls={false}
                      isAnimationActive={false}
                      activeDot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div
                data-complete-day-estimate-row
                className={COMPLETE_DAY_PROJECTION_ESTIMATE_ROW_CLASS}
              >
                <span className="flex min-w-0 flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CompleteDayLegendLineSample series="weight" />
                    {t.dashboard.weightLegend}
                  </span>
                  <span className="flex items-center gap-1">
                    <CompleteDayLegendLineSample series="average" />
                    {t.dashboard.rollingAverageLegend}
                  </span>
                </span>
                <div
                  data-complete-day-estimate
                  className="shrink-0 text-right leading-none"
                >
                  <p className={COMPLETE_DAY_PROJECTION_ESTIMATE_VALUE_CLASS}>
                    ≈{' '}
                    {formatNumber(
                      toDisplay(projection.projectedWeightKg),
                      locale,
                    )}{' '}
                    {unitText}
                  </p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {t.today.completeDayEstimatedLabel}
                  </p>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm leading-snug">
                <p className="flex items-baseline justify-between gap-3">
                  <span className="text-muted-foreground">
                    {t.today.completeDayIntakeLabel}
                  </span>
                  <span className="font-medium">
                    {formatKcal(dailyKcal, locale, t)}
                  </span>
                </p>
                <p className="mt-1 flex items-baseline justify-between gap-3">
                  <span className="text-muted-foreground">
                    {t.today.completeDayMaintenanceLabel}
                  </span>
                  <span className="font-medium">
                    ~{formatKcal(projection.tdeeKcal, locale, t)}
                  </span>
                </p>
                <p className="mt-1 flex items-baseline justify-between gap-3">
                  <span className="text-muted-foreground">
                    {t.today.completeDayDeficitLabel}
                  </span>
                  <span className="font-medium">
                    ~{formatKcal(projection.dailyDeficitKcal, locale, t)}
                  </span>
                </p>
              </div>
              <p className="text-sm">{changeText(projection.totalChangeKg)}</p>
              <p className="text-xs text-muted-foreground">
                {t.today.completeDayDisclaimer}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
