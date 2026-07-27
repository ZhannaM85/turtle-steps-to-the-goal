import { useEffect, useState, type ReactNode } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { addDays, format, parseISO } from 'date-fns'
import { ChevronLeft, ChevronRight, GripVertical } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  totalCalories,
  totalCarbs,
  totalFat,
  totalFiber,
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
import { formatKcal, formatMacroGrams, formatMl } from '@/shared/lib/macroDisplay'
import { Button } from '@/shared/ui/button'
import { EmptyState } from '@/shared/ui/empty-state'
import { InfoTooltip } from '@/shared/ui/info-tooltip'
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
  useTodayCardOrderStore,
  useUnitStore,
  type SectionKey,
  type TodayCardKey,
} from '@/stores'
import { DailyEntryForm } from './DailyEntryForm'
import { GoalCelebrationModal } from './GoalCelebrationModal'

// #343 — a thin drag-handle strip above each reorderable card, same
// on-demand-mode pattern #297/#319 established for Dashboard sections
// (`DashboardScreen.tsx`'s `SortableDashboardSection`) — duplicated here
// rather than extracted into a shared component, since the two screens'
// section shapes differ enough (Dashboard: whole page; Today: one
// sub-group among many other fixed-position elements) that a shared
// abstraction would need its own generic key type threaded through both
// call sites for what's currently only ~25 lines of overlap.
function SortableTodayCard({
  id,
  position,
  isReordering,
  children,
}: {
  id: TodayCardKey
  position: number
  isReordering: boolean
  children: ReactNode
}) {
  const t = useTranslation()
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id, disabled: !isReordering })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div ref={setNodeRef} style={style} className="flex flex-col gap-1">
      {isReordering && (
        <button
          type="button"
          aria-label={t.today.reorderCardLabel(position)}
          className="w-fit cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical aria-hidden="true" className="size-4" />
        </button>
      )}
      {children}
    </div>
  )
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
  // #345 — the real calendar date, ignoring `dayStartTime` entirely.
  // Differs from `todayIso()` only in the gap between midnight and the
  // configured start time, i.e. exactly when someone might want to start
  // logging today early rather than wait for the boundary they set for
  // themselves. A plain date-only comparison (no time-of-day check needed)
  // since `effectiveDateFor` only ever holds `todayIso()` one calendar day
  // behind, never more.
  const realTodayIso = format(new Date(), 'yyyy-MM-dd')
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
  // #326/#328 — consumedKcal (and its four siblings below) named
  // separately rather than inlined into each delta/percent calculation,
  // since the redesigned card descriptions now show the consumed number
  // directly (`targetMinusConsumedText`) instead of leaving the reader to
  // work it out from just the target and the remaining amount.
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
  const consumedProteinG = totalProtein(entry?.calorieEntries) ?? 0
  const proteinDeltaG =
    goal?.dailyProteinTargetG !== undefined
      ? goal.dailyProteinTargetG - consumedProteinG
      : null
  const isOverProteinTarget = proteinDeltaG !== null && proteinDeltaG < 0

  // #252 — same shape as proteinDeltaG above, each independent of the
  // other three targets.
  // #321: no longer clamped at 0 — once intake exceeds the target, the
  // card shows the overage instead of a flat "0g remaining" (same shape
  // #266 already gave protein), just with a neutral unit/description
  // rather than protein's positive "great job!" framing — going over
  // isn't uniformly a good outcome for fat/carbs the way extra protein is.
  const consumedFatG = totalFat(entry?.calorieEntries) ?? 0
  const fatDeltaG =
    goal?.dailyFatTargetG !== undefined
      ? goal.dailyFatTargetG - consumedFatG
      : null
  const isOverFatTarget = fatDeltaG !== null && fatDeltaG < 0
  const consumedCarbG = totalCarbs(entry?.calorieEntries) ?? 0
  const carbDeltaG =
    goal?.dailyCarbTargetG !== undefined
      ? goal.dailyCarbTargetG - consumedCarbG
      : null
  const isOverCarbTarget = carbDeltaG !== null && carbDeltaG < 0

  // #341 — same shape again, independent of the other targets. Neutral
  // "over" framing like fat/carb/water above, not protein's positive one —
  // more fiber isn't obviously good the way more protein specifically is
  // framed here.
  const consumedFiberG = totalFiber(entry?.calorieEntries) ?? 0
  const fiberDeltaG =
    goal?.dailyFiberTargetG !== undefined
      ? goal.dailyFiberTargetG - consumedFiberG
      : null
  const isOverFiberTarget = fiberDeltaG !== null && fiberDeltaG < 0

  // #266/#328 — each remaining-nutrient card's `description` shows target
  // minus consumed together (`targetMinusConsumedText`), so the consumed
  // amount is visible without the reader subtracting it themselves from
  // "0g remaining"/"of Xg" the way the card used to only imply it. #326
  // removed calories' own version of this (calorieTargetText); #328
  // restores an equivalent for calories below, alongside these three.
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
  const fiberTargetText =
    goal?.dailyFiberTargetG !== undefined
      ? formatMacroGrams(goal.dailyFiberTargetG, locale, t)
      : null

  // #258 — same shape again, based on the day's logged water total
  // (#271: summed from waterEntries, not a single stored scalar).
  // #321: no longer clamped at 0, same reasoning as fatDeltaG/carbDeltaG above.
  const consumedWaterMl = totalWaterMl(entry?.waterEntries) ?? 0
  const waterDeltaMl =
    goal?.dailyWaterTargetMl !== undefined
      ? goal.dailyWaterTargetMl - consumedWaterMl
      : null
  const isOverWaterTarget = waterDeltaMl !== null && waterDeltaMl < 0
  // #328 — water didn't have a target-denominator description at all
  // before (unlike protein/fat/carb above); added here for the same
  // reason the other three get one.
  const waterTargetText =
    goal?.dailyWaterTargetMl !== undefined
      ? formatMl(goal.dailyWaterTargetMl, locale, t)
      : null

  // #320 — percent of each numeric daily goal consumed so far, for the
  // remaining-nutrient cards' progress bars below. A falsy target (missing,
  // or the degenerate 0 case) means no bar renders rather than a
  // divide-by-zero.
  // #323 — calories joins the same treatment, added after the other four.
  const caloriesPercent = goal?.dailyCalorieTargetKcal
    ? (consumedKcal / goal.dailyCalorieTargetKcal) * 100
    : null
  const proteinPercent = goal?.dailyProteinTargetG
    ? (consumedProteinG / goal.dailyProteinTargetG) * 100
    : null
  const fatPercent = goal?.dailyFatTargetG
    ? (consumedFatG / goal.dailyFatTargetG) * 100
    : null
  const carbPercent = goal?.dailyCarbTargetG
    ? (consumedCarbG / goal.dailyCarbTargetG) * 100
    : null
  const fiberPercent = goal?.dailyFiberTargetG
    ? (consumedFiberG / goal.dailyFiberTargetG) * 100
    : null
  const waterPercent = goal?.dailyWaterTargetMl
    ? (consumedWaterMl / goal.dailyWaterTargetMl) * 100
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

  // #343 — plain today's-number cards, same shape as BMI above (no
  // target/remaining concept, just whatever was logged). Reuses
  // DailyEntryForm's own field labels (`t.dailyEntry.stepsLabel`/
  // `sleepLabel`) rather than a second "today.*" copy of the same words.
  const stepsValue = entry?.steps
  const sleepValue = entry?.sleepHours

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

  // #343 — drag-and-drop reordering for the "remaining X" cards plus the
  // new Steps/Sleep ones, same on-demand mechanism/mode #297/#319 already
  // gave Dashboard sections (a toggle button, not always-visible handles).
  // Deliberately scoped to just these eight — the weekly-target card, vs-
  // yesterday/vs-max-weight deltas, BMI, and the banners keep their
  // current fixed positions, unaffected by this.
  const cardOrder = useTodayCardOrderStore((state) => state.order)
  const setCardOrder = useTodayCardOrderStore((state) => state.setOrder)
  const [isReorderingCards, setIsReorderingCards] = useState(false)
  const cardDragSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  function handleCardDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = cardOrder.indexOf(active.id as TodayCardKey)
    const newIndex = cardOrder.indexOf(over.id as TodayCardKey)
    setCardOrder(arrayMove(cardOrder, oldIndex, newIndex))
  }

  const cardsByKey: Record<TodayCardKey, ReactNode> = {
    remainingCalories:
      remainingKcal !== null &&
      (sectionVisible.todayRemainingCalories ? (
        <StatCard
          label={t.today.remainingCaloriesLabel}
          value={formatNumber(Math.abs(remainingKcal), locale, 0)}
          unit={isOverCalorieBudget ? t.today.kcalOverUnit : t.today.kcalRemainingUnit}
          description={t.today.targetMinusConsumedText(
            formatKcal(goal!.dailyCalorieTargetKcal!, locale, t),
            formatKcal(consumedKcal, locale, t),
          )}
          progressPercent={caloriesPercent ?? undefined}
          progressColor="var(--chart-calories)"
          action={
            <span className="flex items-center gap-1">
              {bmrValue !== null && (
                <InfoTooltip
                  text={`${t.today.bmrLabel}: ${formatNumber(bmrValue, locale, 0)} ${t.today.bmrUnit}`}
                  label={t.today.bmrTooltipLabel}
                />
              )}
              {statCardAction('todayRemainingCalories', t.today.remainingCaloriesLabel)}
            </span>
          }
        />
      ) : (
        sectionTitle('todayRemainingCalories', t.today.remainingCaloriesLabel)
      )),
    remainingProtein:
      proteinDeltaG !== null &&
      (sectionVisible.todayRemainingProtein ? (
        <StatCard
          label={t.today.remainingProteinLabel}
          value={formatNumber(Math.abs(proteinDeltaG), locale, 0)}
          unit={isOverProteinTarget ? t.today.gOverUnit : t.today.gRemainingUnit}
          description={
            isOverProteinTarget
              ? t.today.proteinOverTargetLabel(
                  proteinTargetText!,
                  formatMacroGrams(consumedProteinG, locale, t),
                )
              : t.today.targetMinusConsumedText(
                  proteinTargetText!,
                  formatMacroGrams(consumedProteinG, locale, t),
                )
          }
          progressPercent={proteinPercent ?? undefined}
          progressColor="var(--stat-protein)"
          action={statCardAction('todayRemainingProtein', t.today.remainingProteinLabel)}
        />
      ) : (
        sectionTitle('todayRemainingProtein', t.today.remainingProteinLabel)
      )),
    remainingFat:
      fatDeltaG !== null &&
      (sectionVisible.todayRemainingFat ? (
        <StatCard
          label={t.today.remainingFatLabel}
          value={formatNumber(Math.abs(fatDeltaG), locale, 0)}
          unit={isOverFatTarget ? t.today.gOverUnit : t.today.gRemainingUnit}
          description={t.today.targetMinusConsumedText(
            fatTargetText!,
            formatMacroGrams(consumedFatG, locale, t),
          )}
          progressPercent={fatPercent ?? undefined}
          progressColor="var(--stat-fat)"
          action={statCardAction('todayRemainingFat', t.today.remainingFatLabel)}
        />
      ) : (
        sectionTitle('todayRemainingFat', t.today.remainingFatLabel)
      )),
    remainingCarbs:
      carbDeltaG !== null &&
      (sectionVisible.todayRemainingCarbs ? (
        <StatCard
          label={t.today.remainingCarbLabel}
          value={formatNumber(Math.abs(carbDeltaG), locale, 0)}
          unit={isOverCarbTarget ? t.today.gOverUnit : t.today.gRemainingUnit}
          description={t.today.targetMinusConsumedText(
            carbTargetText!,
            formatMacroGrams(consumedCarbG, locale, t),
          )}
          progressPercent={carbPercent ?? undefined}
          progressColor="var(--stat-carbs)"
          action={statCardAction('todayRemainingCarbs', t.today.remainingCarbLabel)}
        />
      ) : (
        sectionTitle('todayRemainingCarbs', t.today.remainingCarbLabel)
      )),
    remainingFiber:
      fiberDeltaG !== null &&
      (sectionVisible.todayRemainingFiber ? (
        <StatCard
          label={t.today.remainingFiberLabel}
          value={formatNumber(Math.abs(fiberDeltaG), locale, 0)}
          unit={isOverFiberTarget ? t.today.gOverUnit : t.today.gRemainingUnit}
          description={t.today.targetMinusConsumedText(
            fiberTargetText!,
            formatMacroGrams(consumedFiberG, locale, t),
          )}
          progressPercent={fiberPercent ?? undefined}
          progressColor="var(--stat-fiber)"
          action={statCardAction('todayRemainingFiber', t.today.remainingFiberLabel)}
        />
      ) : (
        sectionTitle('todayRemainingFiber', t.today.remainingFiberLabel)
      )),
    remainingWater:
      waterDeltaMl !== null &&
      (sectionVisible.todayRemainingWater ? (
        <StatCard
          label={t.today.remainingWaterLabel}
          value={formatNumber(Math.abs(waterDeltaMl), locale, 0)}
          unit={isOverWaterTarget ? t.today.mlOverUnit : t.today.mlRemainingUnit}
          description={t.today.targetMinusConsumedText(
            waterTargetText!,
            formatMl(consumedWaterMl, locale, t),
          )}
          progressPercent={waterPercent ?? undefined}
          progressColor="var(--stat-water)"
          action={statCardAction('todayRemainingWater', t.today.remainingWaterLabel)}
        />
      ) : (
        sectionTitle('todayRemainingWater', t.today.remainingWaterLabel)
      )),
    steps:
      stepsValue !== undefined &&
      (sectionVisible.todaySteps ? (
        <StatCard
          label={t.dailyEntry.stepsLabel}
          value={formatNumber(stepsValue, locale, 0)}
          action={statCardAction('todaySteps', t.dailyEntry.stepsLabel)}
        />
      ) : (
        sectionTitle('todaySteps', t.dailyEntry.stepsLabel)
      )),
    sleep:
      sleepValue !== undefined &&
      (sectionVisible.todaySleep ? (
        <StatCard
          label={t.dailyEntry.sleepLabel}
          value={formatNumber(sleepValue, locale, 1)}
          unit={t.dailyEntry.hoursUnit}
          action={statCardAction('todaySleep', t.dailyEntry.sleepLabel)}
        />
      ) : (
        sectionTitle('todaySleep', t.dailyEntry.sleepLabel)
      )),
  }

  return (
    <div className="flex flex-col gap-6">
      <GoalCelebrationModal />
      <PageHeader
        title={t.today.title}
        description={t.today.description}
        action={
          // #343 — same on-demand mode as Dashboard's own reorder toggle;
          // hidden entirely when there's nothing in the reorderable group
          // to reorder (e.g. a day with no goal/log yet).
          cardOrder.some((key) => cardsByKey[key]) && (
            <Button
              type="button"
              variant={isReorderingCards ? 'default' : 'outline'}
              size="sm"
              onClick={() => setIsReorderingCards((prev) => !prev)}
            >
              {isReorderingCards
                ? t.dailyEntry.saveButton
                : t.today.reorderCardsButton}
            </Button>
          )
        }
      />

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
        {/* #345 — only while viewing the effective "today" itself; once
         * the user pages back to an earlier day, offering to jump the
         * calendar forward there wouldn't make sense. Disappears on its
         * own once the real clock reaches dayStartTime, since realTodayIso
         * and todayIso() converge at that point with no user action. */}
        {realTodayIso !== todayIso() && date === todayIso() && (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground">
            <span>{t.today.startTodayEarlyBanner}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => setDate(realTodayIso)}
            >
              {t.today.startTodayEarlyButton}
            </Button>
          </div>
        )}
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

      {/* #328 — was a 3-number CaloriesBreakdownCard (total/consumed/
       * remaining all shown as an equation, #326); condensed to the same
       * single-big-number + small-breakdown-description shape as the
       * macro/water cards below, so all five "remaining" cards read the
       * same way. CaloriesBreakdownCard's own component is now unused and
       * was removed along with it. #343: this whole group (plus Steps/
       * Sleep) is now user-reorderable, same on-demand drag mode #297/
       * #319 gave Dashboard sections — see cardsByKey/cardOrder above. */}
      <DndContext
        sensors={cardDragSensors}
        collisionDetection={closestCenter}
        onDragEnd={handleCardDragEnd}
      >
        <SortableContext items={cardOrder} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-6">
            {cardOrder.map((key, index) =>
              cardsByKey[key] ? (
                <SortableTodayCard
                  key={key}
                  id={key}
                  position={index + 1}
                  isReordering={isReorderingCards}
                >
                  {cardsByKey[key]}
                </SortableTodayCard>
              ) : null,
            )}
          </div>
        </SortableContext>
      </DndContext>

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
