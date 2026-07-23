import { useEffect } from 'react'
import { addDays, format, parseISO } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  totalCalories,
  totalCarbs,
  totalFat,
  totalProtein,
  totalWaterMl,
} from '@/domain/dailyEntry'
import { goalWeekEnd, kgToLb } from '@/domain/goal'
import { calculateBmi, calculateBmr, effectiveDateFor } from '@/domain/stats'
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
import { formatMacroGrams } from '@/shared/lib/macroDisplay'
import { Button } from '@/shared/ui/button'
import { EmptyState } from '@/shared/ui/empty-state'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { PageHeader } from '@/shared/ui/page-header'
import { SectionTitleWithToggle } from '@/shared/ui/section-title-with-toggle'
import { StatCard } from '@/shared/ui/stat-card'
import { VisibilityToggleButton } from '@/shared/ui/visibility-toggle-button'
import {
  useDailyEntryStore,
  useDailyReminderStore,
  useDayStartStore,
  useGoalStore,
  useProfileStore,
  useSectionVisibilityStore,
  useUnitStore,
  type SectionKey,
} from '@/stores'
import { CaloriesBreakdownCard } from './CaloriesBreakdownCard'
import { DailyEntryForm } from './DailyEntryForm'
import { GoalCelebrationModal } from './GoalCelebrationModal'

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
  // #298 — "today" (this screen's default date, and the cap on how far
  // forward the date arrows/picker can go) accounts for a configured
  // day-start time other than midnight, so someone up past midnight isn't
  // pushed onto the next calendar day before they're ready to be. Default
  // '00:00' matches the real calendar date exactly, so this is a no-op
  // for anyone who hasn't touched the new Settings field. First-pass
  // scope only touches this screen — streaks, weekly/monthly summaries,
  // correlation day-pairing, and the fasting-window toast are unaffected
  // for now (resolved via `AskUserQuestion` when this was picked up).
  const dayStartTime = useDayStartStore((state) => state.dayStartTime)
  function todayIso() {
    return format(effectiveDateFor(new Date(), dayStartTime), 'yyyy-MM-dd')
  }
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
  // #326 — consumedKcal named separately (not just inlined into
  // remainingKcal's own calculation) since the breakdown card now shows it
  // as its own number alongside total/remaining.
  const consumedKcal = totalCalories(entry?.calorieEntries) ?? 0
  const remainingKcal =
    goal?.dailyCalorieTargetKcal !== undefined
      ? goal.dailyCalorieTargetKcal - consumedKcal
      : null
  const isOverCalorieBudget = remainingKcal !== null && remainingKcal < 0

  // #220 — same shape as remainingKcal above.
  // #266: no longer clamped at 0 — once intake exceeds the target, the
  // card switches to a positive surplus message (`isOverProteinTarget`
  // below) instead of a flat "0g remaining". A deliberate, protein-only
  // exception: unlike a calorie ceiling, eating more protein than planned
  // is a good outcome worth calling out, not a "went over budget" one.
  const proteinDeltaG =
    goal?.dailyProteinTargetG !== undefined
      ? goal.dailyProteinTargetG - (totalProtein(entry?.calorieEntries) ?? 0)
      : null
  const isOverProteinTarget = proteinDeltaG !== null && proteinDeltaG < 0

  // #252 — same shape as proteinDeltaG above, each independent of the
  // other three targets.
  // #321: no longer clamped at 0 — once intake exceeds the target, the
  // card shows the overage instead of a flat "0g remaining" (same shape
  // #266 already gave protein), just with a neutral unit/description
  // rather than protein's positive "great job!" framing — going over
  // isn't uniformly a good outcome for fat/carbs the way extra protein is.
  const fatDeltaG =
    goal?.dailyFatTargetG !== undefined
      ? goal.dailyFatTargetG - (totalFat(entry?.calorieEntries) ?? 0)
      : null
  const isOverFatTarget = fatDeltaG !== null && fatDeltaG < 0
  const carbDeltaG =
    goal?.dailyCarbTargetG !== undefined
      ? goal.dailyCarbTargetG - (totalCarbs(entry?.calorieEntries) ?? 0)
      : null
  const isOverCarbTarget = carbDeltaG !== null && carbDeltaG < 0

  // #266 — "of X" denominator shown as each remaining-nutrient card's
  // `description`, so "0g remaining" also says what it's out of. #326
  // removed calories' own version of this (calorieTargetText) — the
  // breakdown card shows the target as its own "total" number instead of
  // a denominator caption.
  const proteinTargetText =
    goal?.dailyProteinTargetG !== undefined
      ? formatMacroGrams(goal.dailyProteinTargetG, locale, t)
      : null
  const fatTargetText =
    goal?.dailyFatTargetG !== undefined
      ? formatMacroGrams(goal.dailyFatTargetG, locale, t)
      : null
  const carbTargetText =
    goal?.dailyCarbTargetG !== undefined
      ? formatMacroGrams(goal.dailyCarbTargetG, locale, t)
      : null

  // #258 — same shape again, based on the day's logged water total
  // (#271: summed from waterEntries, not a single stored scalar).
  // #321: no longer clamped at 0, same reasoning as fatDeltaG/carbDeltaG above.
  const waterDeltaMl =
    goal?.dailyWaterTargetMl !== undefined
      ? goal.dailyWaterTargetMl - (totalWaterMl(entry?.waterEntries) ?? 0)
      : null
  const isOverWaterTarget = waterDeltaMl !== null && waterDeltaMl < 0

  // #320 — percent of each numeric daily goal consumed so far, for the
  // remaining-nutrient cards' progress bars below. A falsy target (missing,
  // or the degenerate 0 case) means no bar renders rather than a
  // divide-by-zero.
  // #323 — calories joins the same treatment, added after the other four.
  const caloriesPercent = goal?.dailyCalorieTargetKcal
    ? ((totalCalories(entry?.calorieEntries) ?? 0) /
        goal.dailyCalorieTargetKcal) *
      100
    : null
  const proteinPercent = goal?.dailyProteinTargetG
    ? ((totalProtein(entry?.calorieEntries) ?? 0) / goal.dailyProteinTargetG) *
      100
    : null
  const fatPercent = goal?.dailyFatTargetG
    ? ((totalFat(entry?.calorieEntries) ?? 0) / goal.dailyFatTargetG) * 100
    : null
  const carbPercent = goal?.dailyCarbTargetG
    ? ((totalCarbs(entry?.calorieEntries) ?? 0) / goal.dailyCarbTargetG) * 100
    : null
  const waterPercent = goal?.dailyWaterTargetMl
    ? ((totalWaterMl(entry?.waterEntries) ?? 0) / goal.dailyWaterTargetMl) *
      100
    : null

  // #233 — BMI/BMR, computed from today's logged weight plus the Settings
  // Profile card's height/age/sex. Never stored — recomputed on every
  // render from whatever's currently in profileStore plus this entry's
  // weight, same "derived, not persisted" approach as every other stat
  // card on this screen.
  const { heightCm, age, sex } = useProfileStore()
  const bmiValue =
    entry?.weightKg !== undefined && heightCm !== undefined
      ? calculateBmi(entry.weightKg, heightCm)
      : null
  const bmrValue =
    entry?.weightKg !== undefined &&
    heightCm !== undefined &&
    age !== undefined &&
    sex !== undefined
      ? calculateBmr(entry.weightKg, heightCm, age, sex)
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

  // #232 — each computed/insight section below (not the raw input fields
  // #237 already covers) can be individually hidden, same mechanism
  // #245/#247 gave every Dashboard section. Two small local helpers, not
  // shared components, since they close over this screen's own `t`/store
  // reads — `SectionTitleWithToggle`/`VisibilityToggleButton` themselves
  // are the actual shared, store-agnostic pieces. `sectionTitle` is for a
  // banner (no label of its own to attach the toggle to); `statCardAction`
  // is for a `StatCard`, whose own label row the toggle slots into
  // instead — using both for the same section would show its title twice.
  const sectionVisible = useSectionVisibilityStore((state) => state.visible)
  const toggleSection = useSectionVisibilityStore(
    (state) => state.toggleVisible,
  )
  function sectionTitle(key: SectionKey, title: string) {
    return (
      <SectionTitleWithToggle
        title={title}
        visible={sectionVisible[key]}
        onToggle={() => toggleSection(key)}
        hideLabel={t.common.hideSectionLabel(title)}
        showLabel={t.common.showSectionLabel(title)}
      />
    )
  }
  function statCardAction(key: SectionKey, title: string) {
    return (
      <VisibilityToggleButton
        visible={sectionVisible[key]}
        onToggle={() => toggleSection(key)}
        hideLabel={t.common.hideSectionLabel(title)}
        showLabel={t.common.showSectionLabel(title)}
      />
    )
  }

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
        sectionVisible.todayWeeklyTarget ? (
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
            action={statCardAction('todayWeeklyTarget', t.today.thisWeeksTarget)}
          />
        ) : (
          sectionTitle('todayWeeklyTarget', t.today.thisWeeksTarget)
        )
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

      {weightDeltaValue !== null &&
        (sectionVisible.todayVsYesterday ? (
          <StatCard
            label={t.today.vsYesterdayLabel}
            value={weightDeltaValue}
            unit={unitLabel(displayUnit, t)}
            action={statCardAction('todayVsYesterday', t.today.vsYesterdayLabel)}
          />
        ) : (
          sectionTitle('todayVsYesterday', t.today.vsYesterdayLabel)
        ))}

      {vsMaxWeightValue !== null &&
        (sectionVisible.todayVsMaxWeight ? (
          <StatCard
            label={t.today.vsMaxWeightLabel}
            value={vsMaxWeightValue}
            unit={unitLabel(displayUnit, t)}
            action={statCardAction('todayVsMaxWeight', t.today.vsMaxWeightLabel)}
          />
        ) : (
          sectionTitle('todayVsMaxWeight', t.today.vsMaxWeightLabel)
        ))}

      {remainingKcal !== null &&
        (sectionVisible.todayRemainingCalories ? (
          <CaloriesBreakdownCard
            label={t.today.remainingCaloriesLabel}
            totalValue={formatNumber(
              goal!.dailyCalorieTargetKcal!,
              locale,
              0,
            )}
            totalLabel={t.today.totalCaloriesLabel}
            consumedValue={formatNumber(consumedKcal, locale, 0)}
            consumedLabel={t.today.consumedCaloriesLabel}
            remainingValue={formatNumber(Math.abs(remainingKcal), locale, 0)}
            remainingLabel={
              isOverCalorieBudget
                ? t.today.kcalOverUnit
                : t.today.kcalRemainingUnit
            }
            equationSummary={t.today.caloriesEquationSummary(
              formatNumber(goal!.dailyCalorieTargetKcal!, locale, 0),
              formatNumber(consumedKcal, locale, 0),
              formatNumber(Math.abs(remainingKcal), locale, 0),
              isOverCalorieBudget ? 'over' : 'remaining',
            )}
            progressPercent={caloriesPercent ?? undefined}
            progressColor="var(--chart-calories)"
            action={statCardAction(
              'todayRemainingCalories',
              t.today.remainingCaloriesLabel,
            )}
          />
        ) : (
          sectionTitle(
            'todayRemainingCalories',
            t.today.remainingCaloriesLabel,
          )
        ))}

      {/* #324 — moved next to "Remaining calories" (previously down by
       * BMI) after live feedback that 3 separate kcal-labeled numbers
       * scattered across the page (this, BMR, and the raw logged-calories
       * total on DailyEntryForm further down) read as confusing/
       * duplicative. BMR is a distinct baseline estimate, not a target or
       * a log, so it stays its own card rather than merging into
       * "Remaining calories" — just placed where the relationship between
       * the two is visible instead of a coincidental-looking repeat. */}
      {bmrValue !== null &&
        (sectionVisible.todayBmr ? (
          <StatCard
            label={t.today.bmrLabel}
            value={formatNumber(bmrValue, locale, 0)}
            unit={t.today.bmrUnit}
            action={statCardAction('todayBmr', t.today.bmrLabel)}
          />
        ) : (
          sectionTitle('todayBmr', t.today.bmrLabel)
        ))}

      {proteinDeltaG !== null &&
        (sectionVisible.todayRemainingProtein ? (
          <StatCard
            label={t.today.remainingProteinLabel}
            value={formatNumber(Math.abs(proteinDeltaG), locale, 0)}
            unit={
              isOverProteinTarget
                ? t.today.gOverUnit
                : t.today.gRemainingUnit
            }
            description={
              isOverProteinTarget
                ? t.today.proteinOverTargetLabel(proteinTargetText!)
                : t.today.targetDenominatorText(proteinTargetText!)
            }
            progressPercent={proteinPercent ?? undefined}
            progressColor="var(--stat-protein)"
            action={statCardAction(
              'todayRemainingProtein',
              t.today.remainingProteinLabel,
            )}
          />
        ) : (
          sectionTitle('todayRemainingProtein', t.today.remainingProteinLabel)
        ))}

      {fatDeltaG !== null &&
        (sectionVisible.todayRemainingFat ? (
          <StatCard
            label={t.today.remainingFatLabel}
            value={formatNumber(Math.abs(fatDeltaG), locale, 0)}
            unit={isOverFatTarget ? t.today.gOverUnit : t.today.gRemainingUnit}
            description={t.today.targetDenominatorText(fatTargetText!)}
            progressPercent={fatPercent ?? undefined}
            progressColor="var(--stat-fat)"
            action={statCardAction('todayRemainingFat', t.today.remainingFatLabel)}
          />
        ) : (
          sectionTitle('todayRemainingFat', t.today.remainingFatLabel)
        ))}

      {carbDeltaG !== null &&
        (sectionVisible.todayRemainingCarbs ? (
          <StatCard
            label={t.today.remainingCarbLabel}
            value={formatNumber(Math.abs(carbDeltaG), locale, 0)}
            unit={isOverCarbTarget ? t.today.gOverUnit : t.today.gRemainingUnit}
            description={t.today.targetDenominatorText(carbTargetText!)}
            progressPercent={carbPercent ?? undefined}
            progressColor="var(--stat-carbs)"
            action={statCardAction(
              'todayRemainingCarbs',
              t.today.remainingCarbLabel,
            )}
          />
        ) : (
          sectionTitle('todayRemainingCarbs', t.today.remainingCarbLabel)
        ))}

      {waterDeltaMl !== null &&
        (sectionVisible.todayRemainingWater ? (
          <StatCard
            label={t.today.remainingWaterLabel}
            value={formatNumber(Math.abs(waterDeltaMl), locale, 0)}
            unit={
              isOverWaterTarget ? t.today.mlOverUnit : t.today.mlRemainingUnit
            }
            progressPercent={waterPercent ?? undefined}
            progressColor="var(--stat-water)"
            action={statCardAction(
              'todayRemainingWater',
              t.today.remainingWaterLabel,
            )}
          />
        ) : (
          sectionTitle('todayRemainingWater', t.today.remainingWaterLabel)
        ))}

      {bmiValue !== null &&
        (sectionVisible.todayBmi ? (
          <StatCard
            label={t.today.bmiLabel}
            value={formatNumber(bmiValue, locale, 1)}
            action={statCardAction('todayBmi', t.today.bmiLabel)}
          />
        ) : (
          sectionTitle('todayBmi', t.today.bmiLabel)
        ))}

      {showTargetMetBanner && (
        <div className="flex flex-col gap-1.5">
          {sectionTitle('todayTargetMetBanner', t.today.targetMetSectionTitle)}
          {sectionVisible.todayTargetMetBanner && (
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
        </div>
      )}

      {showGoalRenewalReminder && (
        <div className="flex flex-col gap-1.5">
          {sectionTitle(
            'todayGoalRenewalReminder',
            t.today.goalRenewalReminderSectionTitle,
          )}
          {sectionVisible.todayGoalRenewalReminder && (
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
        </div>
      )}

      {showDailyReminder && (
        <div className="flex flex-col gap-1.5">
          {sectionTitle('todayDailyReminder', t.today.dailyReminderSectionTitle)}
          {sectionVisible.todayDailyReminder && (
            <div className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground">
              {t.today.dailyReminderText}
            </div>
          )}
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
