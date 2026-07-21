import { useEffect } from 'react'
import { addDays, format, parseISO } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { totalCalories, totalProtein } from '@/domain/dailyEntry'
import { goalWeekEnd, kgToLb } from '@/domain/goal'
import {
  formatExactNumber,
  formatNumber,
  getDateFnsLocale,
  unitLabel,
  useLocale,
  useTranslation,
} from '@/i18n'
import {
  useActiveGoalProgress,
  useMaxRecordedWeight,
  usePreviousDayEntry,
} from '@/shared/hooks'
import { Button } from '@/shared/ui/button'
import { EmptyState } from '@/shared/ui/empty-state'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { PageHeader } from '@/shared/ui/page-header'
import { StatCard } from '@/shared/ui/stat-card'
import {
  useDailyEntryStore,
  useDailyReminderStore,
  useGoalStore,
  useUnitStore,
} from '@/stores'
import { DailyEntryForm } from './DailyEntryForm'
import { GoalCelebrationModal } from './GoalCelebrationModal'

function todayIso() {
  return format(new Date(), 'yyyy-MM-dd')
}

function shiftDate(date: string, days: number) {
  return format(addDays(parseISO(date), days), 'yyyy-MM-dd')
}

export function TodayScreen() {
  const t = useTranslation()
  const locale = useLocale()
  const dateFnsLocale = getDateFnsLocale(locale)
  const { goal, status: goalStatus, loadActiveGoal } = useGoalStore()
  const {
    entry,
    status: entryStatus,
    loadEntry,
    saveEntry,
  } = useDailyEntryStore()
  // #200: lives in the URL (?date=), not local useState — a meal pencil
  // navigates away to /entry/:date/meal/:mealId and calls navigate(-1) to
  // return, which remounts this screen from scratch. Local state doesn't
  // survive that remount and always reset to today; a search param does,
  // since navigate(-1) restores the exact prior URL including its query
  // string. replace: true (below) keeps browsing days from spamming the
  // browser history stack with one entry per arrow click.
  const [searchParams, setSearchParams] = useSearchParams()
  const date = searchParams.get('date') ?? todayIso()
  function setDate(next: string | ((prev: string) => string)) {
    const nextDate = typeof next === 'function' ? next(date) : next
    setSearchParams(
      nextDate === todayIso() ? {} : { date: nextDate },
      { replace: true },
    )
  }
  const previousDayEntry = usePreviousDayEntry(date)
  const maxWeightKg = useMaxRecordedWeight(entry)
  // #235: GoalCelebrationModal (#55) already fires the instant a save
  // crosses the target, but it's a one-time dismissible dialog — easy to
  // miss (mid-interaction, an accidental outside-tap) with no second
  // chance to notice it, which is exactly what was reported live. This is
  // a persistent, always-visible complement, same quiet-banner shape as
  // the #38 renewal reminder below, so the "reached" state stays visible
  // for the rest of the window even if the modal moment was missed.
  const activeGoalProgress = useActiveGoalProgress()
  const showTargetMetBanner = activeGoalProgress?.targetMet === true

  useEffect(() => {
    loadActiveGoal()
  }, [loadActiveGoal])

  useEffect(() => {
    loadEntry(date)
  }, [date, loadEntry])

  const displayUnit = useUnitStore((state) => state.unit)
  const toDisplay = (kg: number) => (displayUnit === 'lb' ? kgToLb(kg) : kg)
  const weeklyPace = goal ? toDisplay(goal.targetWeeklyLossKg) : null

  // Day-over-day delta (#42) — a distinct, unsmoothed number from the
  // weekly average-vs-average delta on Dashboard; only shown once both
  // this day and the one before it have a logged weight.
  const weightDeltaKg =
    entry?.weightKg !== undefined && previousDayEntry?.weightKg !== undefined
      ? entry.weightKg - previousDayEntry.weightKg
      : null
  const weightDeltaText =
    weightDeltaKg === null
      ? null
      : formatExactNumber(toDisplay(weightDeltaKg), locale)
  const isWeightLoss = weightDeltaKg !== null && weightDeltaKg < 0
  // Same asymmetric emphasis as the weekly summary cards (#29): a loss is
  // worth noticing, a gain or no-change stays quiet rather than a stark
  // number — day-to-day weight is noisy (water, timing), more so than the
  // week-level delta this echoes.
  const weightDeltaValue =
    weightDeltaText === null ? null : isWeightLoss ? (
      weightDeltaText
    ) : (
      <span className="text-2xl font-normal text-muted-foreground">
        {weightDeltaText}
      </span>
    )

  // Progress vs. the highest weight ever recorded (#100) — a third,
  // longer-horizon delta alongside the day-over-day and weekly-target
  // ones. Only shown once both a current weight and a recorded max exist;
  // same asymmetric emphasis as the other delta cards (#29) — being below
  // the max is the "good" direction, worth noticing.
  const vsMaxWeightKg =
    entry?.weightKg !== undefined && maxWeightKg !== null
      ? entry.weightKg - maxWeightKg
      : null
  const vsMaxWeightText =
    vsMaxWeightKg === null
      ? null
      : formatExactNumber(toDisplay(vsMaxWeightKg), locale)
  const isBelowMaxWeight = vsMaxWeightKg !== null && vsMaxWeightKg < 0
  const vsMaxWeightValue =
    vsMaxWeightText === null ? null : isBelowMaxWeight ? (
      vsMaxWeightText
    ) : (
      <span className="text-2xl font-normal text-muted-foreground">
        {vsMaxWeightText}
      </span>
    )

  // #208 — only shown once the active goal has a dailyCalorieTargetKcal
  // set (an entirely optional field, unlike the weekly weight-loss
  // target). Unlogged calories read as 0 consumed so far, not "unknown" —
  // the whole point is a running total that fills in as the day goes.
  const remainingKcal =
    goal?.dailyCalorieTargetKcal !== undefined
      ? goal.dailyCalorieTargetKcal - (totalCalories(entry?.calorieEntries) ?? 0)
      : null
  const isOverCalorieBudget = remainingKcal !== null && remainingKcal < 0

  // #220 — same shape as remainingKcal above. Clamped at 0 rather than
  // going negative/"over" the way calories can — more protein than
  // planned isn't the same "went over budget" concept a calorie ceiling
  // is, so once the target's met this just reads "0g remaining" rather
  // than needing a second unit string for a surplus state.
  const remainingProteinG =
    goal?.dailyProteinTargetG !== undefined
      ? Math.max(
          0,
          goal.dailyProteinTargetG - (totalProtein(entry?.calorieEntries) ?? 0),
        )
      : null

  // Quiet nudge (#38) once the goal's own anchored window (#135,
  // `goal.weekStart`..`goalWeekEnd(weekStart)`) has run its course, and
  // only when a goal already exists (a goal-less user already sees the
  // "Set a goal" empty state above, which covers that case). Unlike the
  // old fixed-calendar-week version, this doesn't auto-advance on its
  // own — a goal-anchored window only starts fresh when the user actually
  // saves a new target (#135's whole point) — so this stays true on every
  // visit from the day the window completes until it's renewed, rather
  // than only the single day it happened to end. Still no dismiss state
  // to persist, matching the app's no-pressure tone (no badges/streaks).
  const showGoalRenewalReminder = Boolean(
    goal && goal.weekStart && todayIso() >= goalWeekEnd(goal.weekStart),
  )

  // Opt-in, off by default (#171) — only while actually viewing today
  // (not a past/future day pulled up via the date arrows) and only once
  // loading has settled, so it doesn't flash on before entry is known.
  const dailyReminderEnabled = useDailyReminderStore((state) => state.enabled)
  const showDailyReminder =
    dailyReminderEnabled &&
    date === todayIso() &&
    entryStatus === 'ready' &&
    entry === null

  return (
    <div className="flex flex-col gap-6">
      <GoalCelebrationModal />
      <PageHeader title={t.today.title} description={t.today.description} />

      {/* #239: previously sat below the stat cards — the page title never
       * changes, but this does as you page between days, so it used to
       * read as "jumping" the further down the page it was. Fixed
       * position right under the title now, always the first thing after
       * it regardless of how many stat cards render below. */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="log-date">{t.today.dateLabel}</Label>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon-xl"
            aria-label={t.today.previousDayLabel}
            onClick={() => setDate((prev) => shiftDate(prev, -1))}
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <Input
            id="log-date"
            type="date"
            value={date}
            max={todayIso()}
            onChange={(e) => setDate(e.target.value)}
            className="h-12 max-w-48"
          />
          {/* Capped at today (#138), same as the date input's own `max` —
           * logging a future day isn't supported anywhere else in the app,
           * out of scope for "quicker than opening the picker" arrows. */}
          <Button
            type="button"
            variant="outline"
            size="icon-xl"
            aria-label={t.today.nextDayLabel}
            disabled={date >= todayIso()}
            onClick={() => setDate((prev) => shiftDate(prev, 1))}
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      </div>

      {goalStatus === 'loading' || goalStatus === 'idle' ? (
        <p className="text-sm text-muted-foreground">{t.common.loading}</p>
      ) : goal ? (
        <StatCard
          label={t.today.thisWeeksTarget}
          value={formatNumber(-weeklyPace!, locale)}
          unit={t.today.toLose(unitLabel(displayUnit, t))}
          description={
            goal.weekStart
              ? t.common.weekRangeLabel(
                  format(parseISO(goal.weekStart), 'MMM d', {
                    locale: dateFnsLocale,
                  }),
                  format(parseISO(goalWeekEnd(goal.weekStart)), 'MMM d', {
                    locale: dateFnsLocale,
                  }),
                )
              : undefined
          }
        />
      ) : (
        <EmptyState
          title={t.today.emptyGoalTitle}
          description={t.today.emptyGoalDescription}
          action={
            <Button asChild>
              <Link to="/goal">{t.today.setGoalButton}</Link>
            </Button>
          }
        />
      )}

      {weightDeltaValue !== null && (
        <StatCard
          label={t.today.vsYesterdayLabel}
          value={weightDeltaValue}
          unit={unitLabel(displayUnit, t)}
        />
      )}

      {vsMaxWeightValue !== null && (
        <StatCard
          label={t.today.vsMaxWeightLabel}
          value={vsMaxWeightValue}
          unit={unitLabel(displayUnit, t)}
        />
      )}

      {remainingKcal !== null && (
        <StatCard
          label={t.today.remainingCaloriesLabel}
          value={formatNumber(Math.abs(remainingKcal), locale, 0)}
          unit={
            isOverCalorieBudget
              ? t.today.kcalOverUnit
              : t.today.kcalRemainingUnit
          }
        />
      )}

      {remainingProteinG !== null && (
        <StatCard
          label={t.today.remainingProteinLabel}
          value={formatNumber(remainingProteinG, locale, 0)}
          unit={t.today.gRemainingUnit}
        />
      )}

      {showTargetMetBanner && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground">
          <span>{t.today.targetMetBanner}</span>
          <Link
            to="/goal"
            className="shrink-0 font-medium text-foreground underline-offset-4 hover:underline"
          >
            {t.today.reviewGoalLink}
          </Link>
        </div>
      )}

      {showGoalRenewalReminder && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground">
          <span>{t.today.goalRenewalReminder}</span>
          <Link
            to="/goal"
            className="shrink-0 font-medium text-foreground underline-offset-4 hover:underline"
          >
            {t.today.reviewGoalLink}
          </Link>
        </div>
      )}

      {showDailyReminder && (
        <div className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground">
          {t.today.dailyReminderText}
        </div>
      )}

      {entryStatus === 'loading' || entryStatus === 'idle' ? (
        <p className="text-sm text-muted-foreground">{t.common.loading}</p>
      ) : (
        <DailyEntryForm
          key={date}
          date={date}
          existingEntry={entry}
          onSave={saveEntry}
        />
      )}
    </div>
  )
}
