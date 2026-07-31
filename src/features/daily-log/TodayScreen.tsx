import { useEffect, useRef, useState, type ReactNode } from 'react'
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
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  GripVertical,
} from 'lucide-react'
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
  useLatestWeight,
  useMaxRecordedWeight,
  usePreviousDayEntry,
} from '@/shared/hooks'
import { formatKcal, formatMacroGrams, formatMl } from '@/shared/lib/macroDisplay'
import { formatSleepDuration } from '@/shared/lib/sleepDuration'
import { Button } from '@/shared/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/ui/collapsible'
import { EmptyState } from '@/shared/ui/empty-state'
import { InfoTooltip } from '@/shared/ui/info-tooltip'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { PageHeader } from '@/shared/ui/page-header'
import { SectionTitleWithToggle } from '@/shared/ui/section-title-with-toggle'
import { StatCard } from '@/shared/ui/stat-card'
import { VisibilityToggleButton } from '@/shared/ui/visibility-toggle-button'
import {
  DEFAULT_TODAY_CARD_ORDER,
  useDailyEntryStore,
  useDailyReminderStore,
  useDayStartStore,
  useGoalStore,
  useProfileStore,
  useSectionVisibilityStore,
  useTodayCardOrderStore,
  useTodayStatsCollapseStore,
  useUnitStore,
  type SectionKey,
  type TodayCardKey,
} from '@/stores'
import { CustomMetricLogSection } from '@/features/custom-metrics'
import { DailyEntryFormBottom } from './DailyEntryFormBottom'
import { DailyEntryFormMorning } from './DailyEntryFormMorning'
import { DailyEntryFormStateProvider } from './DailyEntryFormStateContext'
import { DailyEntryFormTop } from './DailyEntryFormTop'
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

  // #388 — reported live: the handle sat on its own line above the card
  // instead of beside it. Unlike Dashboard's own chart cards (each with a
  // title row the handle can slot into, #355), these StatCards have no
  // such row, so the handle gets its own column to the left instead — a
  // row layout rather than #355's "hand it to the title" render-prop.
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-1">
      {isReordering && (
        <button
          type="button"
          aria-label={t.today.reorderCardLabel(position)}
          className="shrink-0 cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical aria-hidden="true" className="size-4" />
        </button>
      )}
      <div className="min-w-0 flex-1">{children}</div>
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
  // #465 debug instrument (temporary — remove once resolved). Follow-up
  // to #420 (fixed/closed — see button.tsx's icon-xl comment and
  // ARCHITECTURE.md for that history): the Date input's *width* visibly
  // grew once the "Сегодня" button was gone (today's own date,
  // `date !== todayIso()` false). On-device measurement confirmed it:
  // 179px with the button present, 214px without — and 214 exceeds
  // `max-w-48`'s own 192px cap, meaning that constraint wasn't actually
  // binding on this native control at all. First fix attempt (a fixed-
  // width wrapping `<div>` + overflow-hidden, matching #420's own
  // wrapper-div height fix) hit the identical failure mode live: the
  // native control paints wider than whatever box it's given, so
  // clipping cut into its own real border again, same as #420's 4th
  // attempt did for height. Fixed at the actual source instead — see
  // the "Сегодня" button's own comment below — rather than trying a 3rd
  // guessed width constraint on the input itself. ?debug=465 still
  // reports width×height for each row element on-screen for future
  // reference (now readable even on today's own date, since the today
  // button is always rendered).
  const debug465 = searchParams.get('debug') === '465'
  const debug465PrevRef = useRef<HTMLButtonElement>(null)
  const debug465DateRef = useRef<HTMLInputElement>(null)
  const debug465NextRef = useRef<HTMLButtonElement>(null)
  const debug465TodayRef = useRef<HTMLButtonElement>(null)
  const [debug465Sizes, setDebug420Sizes] = useState<
    Record<
      'prev' | 'date' | 'next' | 'today',
      { width: number; height: number } | null
    >
  >({ prev: null, date: null, next: null, today: null })

  const previousDayEntry = usePreviousDayEntry(date)
  const maxWeightKg = useMaxRecordedWeight(entry)
  // #469 — the weekly-target card's reference weight. Today's own
  // `entry.weightKg` would read blank before it's logged for the day
  // (reported live: still no reference shown first thing in the morning,
  // exactly when this is most wanted) — `useLatestWeight` falls back
  // across every past entry instead, same "most recent known weight"
  // helper #259's "Suggest a target" already uses.
  const latestWeightKg = useLatestWeight(entry)
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

  // #465 debug instrument (temporary) — see the comment above where these
  // refs/state are declared. ResizeObserver rather than a one-shot measure
  // so a late layout shift (native control chrome finishing its own
  // render after mount) still gets caught.
  useEffect(() => {
    if (!debug465) return
    const targets: Array<[keyof typeof debug465Sizes, HTMLElement | null]> = [
      ['prev', debug465PrevRef.current],
      ['date', debug465DateRef.current],
      ['next', debug465NextRef.current],
      ['today', debug465TodayRef.current],
    ]
    const observer = new ResizeObserver(() => {
      setDebug420Sizes((prev) => {
        const next = { ...prev }
        for (const [key, el] of targets) {
          if (el) {
            const rect = el.getBoundingClientRect()
            next[key] = { width: rect.width, height: rect.height }
          }
        }
        return next
      })
    })
    for (const [, el] of targets) {
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [debug465, date])

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
  // #353 — reported live right after validating #343: the Sleep tile only
  // showed the total, even though deep sleep is already logged right below
  // it on this same form. Shown as the card's description line rather than
  // folded into the main value, same "primary number + secondary detail"
  // shape other StatCards with a description already use.
  const deepSleepValue = entry?.deepSleepHours

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
  const resetCardOrder = useTodayCardOrderStore((state) => state.resetOrder)
  // #418 — BMI/the two weight deltas/the reorderable group below all
  // collapse together as one block, separate from this per-card reorder
  // mechanism (which stays scoped to just the eight reorderable cards).
  const statsCollapsed = useTodayStatsCollapseStore((state) => state.collapsed)
  const setStatsCollapsed = useTodayStatsCollapseStore(
    (state) => state.setCollapsed,
  )
  // #359 — same reasoning as Dashboard's own reset-button fix: disable it
  // once there's nothing left to reset.
  const isDefaultCardOrder = cardOrder.every(
    (key, i) => key === DEFAULT_TODAY_CARD_ORDER[i],
  )
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
          onClick={() => {
            const waterSection = document.getElementById('water-entry-section')
            waterSection?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }}
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
          value={formatSleepDuration(
            sleepValue,
            t.dailyEntry.hoursUnit,
            t.dailyEntry.minutesUnit,
          )}
          description={
            deepSleepValue === undefined
              ? undefined
              : t.today.deepSleepDescription(
                  formatSleepDuration(
                    deepSleepValue,
                    t.dailyEntry.hoursUnit,
                    t.dailyEntry.minutesUnit,
                  ),
                )
          }
          action={statCardAction('todaySleep', t.dailyEntry.sleepLabel)}
        />
      ) : (
        sectionTitle('todaySleep', t.dailyEntry.sleepLabel)
      )),
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
        <div className="flex items-center gap-1.5">
          <Label htmlFor="log-date">{t.today.dateLabel}</Label>
          {/* #405 — visible at a glance while stepping through history via
           * the arrows, before scrolling down into the form itself. #422:
           * reported live — a screen-reader-only aria-label on a plain
           * decorative span gave a sighted user no way to learn what the
           * checkmark meant. Now an actual tappable `InfoTooltip` trigger
           * (custom `icon` override, #422's own addition, so the
           * meaningful checkmark glyph isn't replaced by a generic "i") —
           * a sibling of the `<Label>`, not nested inside it: a `<label>`
           * implicitly extends its own accessible name to any interactive
           * element nested inside it, which would have made this button's
           * name read as "Date This day has logged entries" instead of
           * just the latter. */}
          {entry !== null && (
            <InfoTooltip
              text={t.today.dayHasEntriesLabel}
              label={t.today.dayHasEntriesLabel}
              className="size-auto rounded-full bg-primary/15 p-0.5 text-primary hover:text-primary"
              icon={<Check aria-hidden="true" className="size-3" />}
            />
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* #420 (fixed) — sized to match the Date input's own real
           * rendered height (measured on-device at 42px) instead of the
           * app-wide icon-xl/48px used elsewhere, since 2 separate
           * attempts to clip the native input down to 48px both ended up
           * cutting off its own real border rather than invisible
           * overflow — it genuinely paints larger than 48px and can't be
           * boxed down cleanly. Scoped to just this row's controls, not
           * the shared icon-xl class other Today rows (Weight/Sleep/
           * Steps/Notes) still use. See ARCHITECTURE.md for the full
           * history. #465 (open) — see the comment by debug465's
           * declaration above: this row's width has its own, separate
           * follow-up quirk. */}
          <Button
            ref={debug465PrevRef}
            type="button"
            variant="outline"
            size="icon-xl"
            className="size-[2.625rem]"
            aria-label={t.today.previousDayLabel}
            onClick={() => setDate((prev) => shiftDate(prev, -1))}
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          {/* #465 — a fixed-width wrapper (matching #420's own
           * wrapper-div height fix) was tried first, but hit the exact
           * same failure mode live: the native control paints wider than
           * whatever box it's given, so clipping it (however it's
           * clipped) cuts into its own real border again. Fixed at the
           * actual source instead: the "Сегодня" button below is now
           * always rendered (see its own comment), reserving constant
           * layout space in this row regardless of the viewed date, so
           * the input's available flex space — and therefore its natural
           * width — never changes. No width constraint needed here at
           * all once the row's own space stops varying. */}
          <Input
            id="log-date"
            ref={debug465DateRef}
            type="date"
            value={date}
            max={todayIso()}
            onChange={(e) => setDate(e.target.value)}
            className="max-w-48"
          />
          {/* Capped at today (#138), same as the date input's own `max` —
           * logging a future day isn't supported anywhere else in the app,
           * out of scope for "quicker than opening the picker" arrows. */}
          <Button
            ref={debug465NextRef}
            type="button"
            variant="outline"
            size="icon-xl"
            className="size-[2.625rem]"
            aria-label={t.today.nextDayLabel}
            disabled={date >= todayIso()}
            onClick={() => setDate((prev) => shiftDate(prev, 1))}
          >
            <ChevronRight aria-hidden="true" />
          </Button>
          {/* #403 — quick way back after paging/picking far away, instead
           * of stepping/picking manually all the way back. #420: explicit
           * height override (no named text-content button size reaches
           * 42px on its own) to match the arrows/Date input it shares this
           * row with, same "same row, same height" rule documented on
           * button.tsx's own size variants. #465: always rendered now
           * (previously conditionally mounted via `date !== todayIso()`)
           * — `invisible` instead of unmounting it keeps its layout
           * footprint in the row constant regardless of the viewed date,
           * which is what actually fixes the Date input's width jump:
           * its available flex space no longer changes based on whether
           * this button is "shown." `disabled`/`aria-hidden`/`tabIndex`
           * keep it fully inert while invisible — a sighted user tabbing
           * through or a screen reader has no reason to land on a button
           * that isn't there, from their perspective. */}
          <Button
            ref={debug465TodayRef}
            type="button"
            variant="outline"
            size="sm"
            className={
              date === todayIso()
                ? 'invisible h-[2.625rem] shrink-0'
                : 'h-[2.625rem] shrink-0'
            }
            disabled={date === todayIso()}
            aria-hidden={date === todayIso()}
            tabIndex={date === todayIso() ? -1 : undefined}
            onClick={() => setDate(todayIso())}
          >
            {t.today.jumpToTodayButton}
          </Button>
        </div>
        {debug465 && (
          <p className="font-mono text-xs text-muted-foreground">
            #465 w×h (px) — prev:
            {debug465Sizes.prev
              ? `${debug465Sizes.prev.width.toFixed(0)}×${debug465Sizes.prev.height.toFixed(0)}`
              : '?'}{' '}
            date:
            {debug465Sizes.date
              ? `${debug465Sizes.date.width.toFixed(0)}×${debug465Sizes.date.height.toFixed(0)}`
              : '?'}{' '}
            next:
            {debug465Sizes.next
              ? `${debug465Sizes.next.width.toFixed(0)}×${debug465Sizes.next.height.toFixed(0)}`
              : '?'}{' '}
            today:
            {debug465Sizes.today
              ? `${debug465Sizes.today.width.toFixed(0)}×${debug465Sizes.today.height.toFixed(0)}`
              : '?'}
          </p>
        )}
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
                ? [
                    t.common.weekRangeLabel(
                      format(parseISO(goal.weekStart), 'PP', {
                        locale: dateFnsLocale,
                      }),
                      format(parseISO(goalWeekEnd(goal.weekStart)), 'PP', {
                        locale: dateFnsLocale,
                      }),
                    ),
                    // #469 — this is a flat weekly-pace target, not derived
                    // from any specific weight, so the figure alone reads
                    // as ambiguous ("-0.1kg from what?"). Surfaces the most
                    // recently logged weight as that reference point — not
                    // just today's own (`entry?.weightKg`), which reported
                    // live as still blank first thing in the morning,
                    // before today's weigh-in, exactly when this is most
                    // wanted.
                    latestWeightKg !== null
                      ? t.today.weeklyTargetFromWeight(
                          `${formatExactNumber(toDisplay(latestWeightKg), locale)} ${unitLabel(displayUnit, t)}`,
                        )
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')
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

      {/* #419 — everything from here down (Morning entries plus the rest
       * of the daily-entry form further below) shares one live form-state
       * instance via context, keyed by `date` so it resets cleanly per
       * day, same as `key={date}` on a single component used to do before
       * this was split across two non-adjacent render spots. */}
      {entryStatus === 'loading' || entryStatus === 'idle' ? (
        <p className="text-sm text-muted-foreground">{t.common.loading}</p>
      ) : (
      <DailyEntryFormStateProvider
        key={date}
        date={date}
        existingEntry={entry}
        onSave={saveEntry}
      >
        {/* #419 — reported live: the actual logging fields (Weight/Sleep/
         * Body measurements/Body composition) used to sit at the very
         * bottom of this screen, past BMI/the deltas/the whole reorderable
         * stat-card group/the banners. Moved here, right after the Goal
         * target card, so logging doesn't require scrolling past a wall of
         * stat cards first. Meals/Water/Custom Metrics/Evening entries stay
         * further down, unaffected. Gating this whole block (not just this
         * one piece) on `entryStatus` matters, not just cosmetic — the
         * shared `useDailyEntryFormState` inside the provider memoizes its
         * initial values once on mount (`[]` deps), so it must not mount
         * until `entry` is the real loaded value, same guarantee a single
         * bottom-of-page gate used to give it before this was split. */}
        <DailyEntryFormMorning />

        {/* #418 — BMI, the two weight deltas, and the reorderable card
         * group below all collapse together as one block (expanded by
         * default, persisted via useTodayStatsCollapseStore) — reported
         * live as a long uninterrupted wall of stat cards between the Goal
         * target card/Morning entries above and Meals/Water/Custom
         * Metrics/Evening entries further down. The Goal target card,
         * Morning entries, and the banners below all stay outside this
         * block, unaffected. */}
        {/* #421 — the trigger and its collapsed content used to be two
         * visually separate pieces (the trigger had its own border box,
         * the cards below had none linking them together) — reported live
         * as looking detached. One shared bordered container now wraps
         * both, same `rounded-lg border border-border p-3` treatment
         * `DailyEntryFormMorning`/`DailyEntryFormBottom` already use for
         * their own grouped sections. */}
        <div className="rounded-lg border border-border p-3">
        <Collapsible
          open={!statsCollapsed}
          onOpenChange={(open) => setStatsCollapsed(!open)}
        >
          <div className="flex items-center justify-between gap-2">
            {/* #470 — the label stays the one real accessible trigger
             * (aria-label carries the expand/collapse meaning); the
             * trailing chevron below is a second, `aria-hidden` trigger —
             * same toggle, visually last in the row instead of stuck
             * right after the label, so the Reorder controls can sit
             * between the two without nesting a button inside a button. */}
            <CollapsibleTrigger asChild>
              <button
                type="button"
                aria-label={
                  statsCollapsed
                    ? t.today.expandStatsLabel
                    : t.today.collapseStatsLabel
                }
                className="text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                {t.today.statsSectionLabel}
              </button>
            </CollapsibleTrigger>
            {/* #470 — moved here from the page header: this only ever
             * reorders the card group below, inside this same accordion,
             * but used to sit next to the page's own "Today" title at the
             * very top, reading as if it reordered the whole page.
             * Entering reorder mode also force-expands this section (it
             * was previously independent of statsCollapsed) — the cards
             * being reordered would otherwise stay hidden behind a
             * collapsed trigger the reorder toggle now sits directly on. */}
            {cardOrder.some((key) => cardsByKey[key]) && (
              <div className="flex flex-1 items-center justify-end gap-2">
                {isReorderingCards && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isDefaultCardOrder}
                    onClick={resetCardOrder}
                  >
                    {t.today.resetCardOrderButton}
                  </Button>
                )}
                <Button
                  type="button"
                  variant={isReorderingCards ? 'default' : 'outline'}
                  size="sm"
                  onClick={() =>
                    setIsReorderingCards((prev) => {
                      const next = !prev
                      if (next) setStatsCollapsed(false)
                      return next
                    })
                  }
                >
                  {isReorderingCards
                    ? t.dailyEntry.saveButton
                    : t.today.reorderCardsButton}
                </Button>
              </div>
            )}
            <CollapsibleTrigger asChild>
              <button
                type="button"
                aria-hidden="true"
                tabIndex={-1}
                className="group shrink-0"
              >
                <ChevronDown
                  aria-hidden="true"
                  className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
                />
              </button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <div className="flex flex-col gap-6 pt-3">
              {/* #415 — moved here, right after the Goal target card, from
               * after the reorderable card group below: with most other
               * stat cards hidden via Settings, BMI was ending up the only
               * visible one in this whole section while still rendering
               * last within it. */}
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

              {weightDeltaValue !== null &&
                (sectionVisible.todayVsYesterday ? (
                  <StatCard
                    label={t.today.vsYesterdayLabel}
                    value={weightDeltaValue}
                    unit={unitLabel(displayUnit, t)}
                    action={statCardAction(
                      'todayVsYesterday',
                      t.today.vsYesterdayLabel,
                    )}
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
                    action={statCardAction(
                      'todayVsMaxWeight',
                      t.today.vsMaxWeightLabel,
                    )}
                  />
                ) : (
                  sectionTitle('todayVsMaxWeight', t.today.vsMaxWeightLabel)
                ))}

              {/* #328 — was a 3-number CaloriesBreakdownCard (total/consumed/
               * remaining all shown as an equation, #326); condensed to the
               * same single-big-number + small-breakdown-description shape
               * as the macro/water cards below, so all five "remaining"
               * cards read the same way. CaloriesBreakdownCard's own
               * component is now unused and was removed along with it.
               * #343: this whole group (plus Steps/Sleep) is now
               * user-reorderable, same on-demand drag mode #297/#319 gave
               * Dashboard sections — see cardsByKey/cardOrder above. */}
              <DndContext
                sensors={cardDragSensors}
                collisionDetection={closestCenter}
                onDragEnd={handleCardDragEnd}
              >
                <SortableContext
                  items={cardOrder}
                  strategy={verticalListSortingStrategy}
                >
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
            </div>
          </CollapsibleContent>
        </Collapsible>
        </div>

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

        <DailyEntryFormTop />
        <CustomMetricLogSection date={date} />
        <DailyEntryFormBottom />
      </DailyEntryFormStateProvider>
      )}
    </div>
  )
}
