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
  completeDayChartEndAxisLabel,
  completeDayHorizonWeeks,
  completeDayProjectionBlocker,
  completeDayProjectionEndIso,
  completeDayWeekGridTicks,
  completeDayWeightGridTicksKg,
  projectWeightIfEatingLikeToday,
  type CompleteDayHorizon,
} from '@/domain/stats'
import { formatLocalizedDate, formatNumber, unitLabel, useLocale } from '@/i18n'
import { formatKcal } from '@/shared/lib/macroDisplay'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/shared/ui/dialog'
import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/toggle-group'
import { useProfileStore, useUnitStore } from '@/stores'
import { useDailyEntryFormStateContext } from './useDailyEntryFormStateContext'

export function CompleteDayWeekTick({
  x,
  y,
  payload,
  todayLabel,
  endLabel,
  endWeek,
}: {
  x?: number
  y?: number
  payload?: { value?: number }
  todayLabel: string
  endLabel: string
  endWeek: number
}) {
  const week = payload?.value
  const label =
    week === 0
      ? todayLabel
      : week !== undefined && Math.abs(week - endWeek) < 1e-6
        ? endLabel
        : ''
  if (!label || x === undefined || y === undefined) return null
  return (
    <text
      x={x}
      y={y}
      dy={14}
      textAnchor={week === 0 ? 'start' : 'end'}
      fontSize={12}
      fill="var(--muted-foreground)"
    >
      {label}
    </text>
  )
}

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
 * #944 — outline chrome matches "Start today's log now" (beige fill, thin
 * border, dark text) so the full-width CTA is not a solid olive block.
 * #948 — segmented horizon tabs match Settings export period pills.
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
  const chartKg =
    projection?.chartPoints.flatMap((point) => [
      point.weightKg,
      point.averageKg,
    ]) ?? []
  const weightTicks =
    chartKg.length > 0
      ? completeDayWeightGridTicksKg(
          Math.min(...chartKg),
          Math.max(...chartKg),
        ).map(toDisplay)
      : []

  const weekEndLabel = completeDayChartEndAxisLabel(
    formatLocalizedDate(
      completeDayProjectionEndIso(state.date, horizon),
      locale,
    ),
  )

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
          closeLabel={t.today.celebrationCloseLabel}
        >
          <DialogTitle className="pr-10 text-2xl leading-snug">
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
            <div className="mt-6 flex flex-col gap-6">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t.today.completeDayTodayLabel}
                </p>
                <p className="text-2xl font-semibold">
                  {formatNumber(toDisplay(state.weightKg), locale)} {unitText}
                </p>
              </div>
              <ToggleGroup
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
                className="flex flex-wrap justify-start"
              >
                {COMPLETE_DAY_HORIZONS.map((id) => (
                  <ToggleGroupItem key={id} value={id} className="h-12">
                    {
                      {
                        week: t.export.exportRangeWeek,
                        month: t.export.exportRangeMonth,
                        year: t.export.exportRangeYear,
                      }[id]
                    }
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 12, right: 8, left: 8, bottom: 8 }}
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
                    {weightTicks.map((weight) => (
                      <ReferenceLine
                        key={`kg-${weight}`}
                        y={weight}
                        stroke="var(--muted-foreground)"
                        strokeOpacity={0.35}
                        strokeDasharray="5 4"
                        strokeWidth={1}
                      />
                    ))}
                    <XAxis
                      dataKey="week"
                      type="number"
                      domain={[0, endWeek]}
                      ticks={weekTicks}
                      interval={0}
                      tick={
                        <CompleteDayWeekTick
                          todayLabel={t.today.completeDayWeekNow}
                          endLabel={weekEndLabel}
                          endWeek={endWeek}
                        />
                      }
                      axisLine={{ stroke: 'var(--border)' }}
                      tickLine={false}
                      height={28}
                    />
                    <YAxis
                      type="number"
                      domain={
                        weightTicks.length > 1
                          ? [
                              weightTicks[0]!,
                              weightTicks[weightTicks.length - 1]!,
                            ]
                          : ['auto', 'auto']
                      }
                      ticks={weightTicks}
                      interval={0}
                      tick={false}
                      axisLine={false}
                      tickLine={false}
                      width={0}
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
                    {/* #946/#947: dashed muted companion — trailing average
                     * of the oscillating daily series (#214 tokens). */}
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
              <span className="flex gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CompleteDayLegendLineSample series="weight" />
                  {t.dashboard.weightLegend}
                </span>
                <span className="flex items-center gap-1">
                  <CompleteDayLegendLineSample series="average" />
                  {t.dashboard.rollingAverageLegend}
                </span>
              </span>
              <div className="text-right">
                <p className="text-3xl font-semibold">
                  ≈{' '}
                  {formatNumber(
                    toDisplay(projection.projectedWeightKg),
                    locale,
                  )}{' '}
                  {unitText}
                </p>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t.today.completeDayEstimatedLabel}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm">
                <p className="text-muted-foreground">
                  {t.today.completeDayIntakeLabel}
                </p>
                <p className="mb-3 font-medium">
                  {formatKcal(dailyKcal, locale, t)}
                </p>
                <p className="text-muted-foreground">
                  {t.today.completeDayMaintenanceLabel}
                </p>
                <p className="mb-3 font-medium">
                  ~{formatKcal(projection.tdeeKcal, locale, t)}
                </p>
                <p className="text-muted-foreground">
                  {t.today.completeDayDeficitLabel}
                </p>
                <p className="font-medium">
                  ~{formatKcal(projection.dailyDeficitKcal, locale, t)}
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
