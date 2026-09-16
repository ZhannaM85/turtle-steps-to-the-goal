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
  COMPLETE_DAY_HORIZON_WEEKS,
  completeDayProjectionBlocker,
  completeDayWeekGridTicks,
  completeDayWeightGridTicksKg,
  projectWeightIfEatingLikeToday,
} from '@/domain/stats'
import { formatNumber, unitLabel, useLocale } from '@/i18n'
import { formatKcal } from '@/shared/lib/macroDisplay'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/shared/ui/dialog'
import { useProfileStore, useUnitStore } from '@/stores'
import { useDailyEntryFormStateContext } from './useDailyEntryFormStateContext'

/**
 * #934 — Day CTA + full-height sheet: if days like today became the usual
 * pattern, where weight might be in five weeks. Close with the X only.
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
        })
      : null

  const toDisplay = (kg: number) => (unit === 'lb' ? kgToLb(kg) : kg)
  const unitText = unitLabel(unit, t)
  const chartData =
    projection?.points.map((point) => ({
      week: point.week,
      weight: toDisplay(point.weightKg),
    })) ?? []
  const weekTicks = completeDayWeekGridTicks()
  const weightTicks = projection
    ? completeDayWeightGridTicksKg(
        Math.min(...projection.points.map((point) => point.weightKg)),
        Math.max(...projection.points.map((point) => point.weightKg)),
      ).map(toDisplay)
    : []

  const changeText = (totalChangeKg: number) => {
    const amount = `${formatNumber(Math.abs(toDisplay(totalChangeKg)), locale)} ${unitText}`
    if (Math.abs(totalChangeKg) < 0.05) return t.today.completeDayChangeSame
    if (totalChangeKg > 0) return t.today.completeDayChangeLower(amount)
    return t.today.completeDayChangeHigher(amount)
  }

  return (
    <>
      <Button
        type="button"
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
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 12, right: 8, left: 8, bottom: 0 }}
                  >
                    {weekTicks.map((week) => (
                      <ReferenceLine
                        key={`week-${week}`}
                        x={week}
                        stroke="var(--muted-foreground)"
                        strokeDasharray="5 4"
                        strokeWidth={1.5}
                      />
                    ))}
                    {weightTicks.map((weight) => (
                      <ReferenceLine
                        key={`kg-${weight}`}
                        y={weight}
                        stroke="var(--muted-foreground)"
                        strokeDasharray="5 4"
                        strokeWidth={1.5}
                      />
                    ))}
                    <XAxis
                      dataKey="week"
                      type="number"
                      domain={[0, COMPLETE_DAY_HORIZON_WEEKS]}
                      ticks={weekTicks}
                      interval={0}
                      tickFormatter={(week: number) =>
                        week === 0
                          ? t.today.completeDayWeekNow
                          : week === COMPLETE_DAY_HORIZON_WEEKS
                            ? t.today.completeDayWeekEnd
                            : ''
                      }
                      tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                      axisLine={{ stroke: 'var(--border)' }}
                      tickLine={false}
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
                      type="monotone"
                      dataKey="weight"
                      stroke="var(--chart-weight)"
                      strokeWidth={2.5}
                      activeDot={false}
                      dot={(props) => {
                        const week = (
                          props as { payload?: { week?: number } }
                        ).payload?.week
                        if (
                          week !== 0 &&
                          week !== COMPLETE_DAY_HORIZON_WEEKS
                        ) {
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
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="text-right">
                <p className="text-3xl font-semibold">
                  ≈ {formatNumber(toDisplay(projection.projectedWeightKg), locale)}{' '}
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
