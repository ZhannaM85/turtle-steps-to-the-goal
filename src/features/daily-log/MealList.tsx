import { useEffect, useMemo, useRef, useState } from 'react'
import { format, parseISO, subDays } from 'date-fns'
import { Pencil, Trash2 } from 'lucide-react'
import { foods } from '@/data/foods'
import type {
  CalorieEntry,
  CalorieItem,
  DailyEntry,
  DayTotals,
  EatingReason,
  Emotion,
} from '@/domain/dailyEntry'
import {
  applyEatingReasons,
  calorieEntryCarbs,
  calorieEntryFat,
  calorieEntryFiber,
  calorieEntryKcal,
  calorieEntryProtein,
  isBuiltInEatingReason,
  mealEatingReasons,
  totalCalories,
  totalCarbs,
  totalFat,
  totalProtein,
} from '@/domain/dailyEntry'
import {
  evaluateMealNutritionFacts,
  type NutritionFactId,
} from '@/domain/nutritionFacts'
import type { ElapsedParts } from '@/domain/stats'
import { fastingHoursBetween, gapsSincePreviousMeal, resolveLastMealInstant, todayIsoForDayStart } from '@/domain/stats'
import {
  formatNumber,
  useLocale,
  useTranslation,
  type Dictionary,
  type Locale,
} from '@/i18n'
import { IndexedDbDailyEntryRepository } from '@/infrastructure/persistence/indexeddb'
import { formatEatingReasonsLine } from '@/shared/lib/eatingReasonDisplay'
import { MEAL_EMOTIONS } from '@/shared/lib/emotionIcons'
import {
  formatMacroGrams,
  macrosSummaryTextCompact,
  macrosSummaryTextCompactWithCalories,
} from '@/shared/lib/macroDisplay'
import { defaultMealLabel, editableMealLabel, effectiveMealLabel, effectiveTimeEaten, sortCalorieEntriesByLoggedTime } from '@/shared/lib/mealLabel'
import { normalizeTextSpaces } from '@/shared/lib/normalizeTextSpaces'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { useCopyYesterdayMealsStore, useDayStartStore, useEatingReasonTrackingStore, useMealItemStore, useMealSlotDefaultTimesStore, useSinceLastMealTimerStore } from '@/stores'
import { AddMealDialog } from './AddMealDialog'
import { CopyDayMealsDialog } from './CopyDayMealsDialog'
import { SinceLastMealTimer } from './SinceLastMealTimer'

/** #764 — Day-card dots for why this meal happened. */
const EATING_REASON_DOT_CLASS: Record<EatingReason, string> = {
  hunger: 'bg-green-500',
  angry: 'bg-red-500',
  lonely: 'bg-pink-500',
  tired: 'bg-slate-500',
  habit: 'bg-yellow-400',
  craving: 'bg-orange-500',
  stress: 'bg-blue-500',
  boredom: 'bg-purple-500',
  company: 'bg-zinc-300 dark:bg-zinc-500',
}

// Every curated food's name in either locale (#150) — names an item picked
// via FoodPickerDialog can carry, distinct from a name the user actually
// typed themselves. `foods.ts` is static, so this only needs computing once
// rather than per-render or per-save.
const curatedFoodNames = new Set(foods.flatMap((food) => [food.en, food.ru]))

// #600 — how long the undo toast stays up after a meal delete, within the
// 8-10s window the issue asked for.
const MEAL_DELETE_UNDO_WINDOW_MS = 9000

/** #794 — `fastingHoursBetween` returns a float; show hours + minutes. */
function hoursMinutesFromDecimalHours(value: number): {
  hours: number
  minutes: number
} {
  const totalMinutes = Math.round(value * 60)
  return {
    hours: Math.floor(totalMinutes / 60),
    minutes: totalMinutes % 60,
  }
}

// #190: own repository instance, same no-shared-store pattern as
// useHistoryData/useDashboardData — fetches the day *before* `date` to
// power the "Repeat yesterday's [meal]" quick action.
const dailyEntryRepository = new IndexedDbDailyEntryRepository()

/** Default for a newly-added meal's time-eaten field (#65) — "the time when
 * user enters the entry". Not used for editing an existing meal, which
 * reflects whatever time (if any) was already saved on it. */
function currentTimeHHMM(): string {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

/** #563/#568/#576 — mid-typing draft value for meal name. Exact match to
 * the positional default clears `CalorieEntry.label` so language switches
 * still re-translate unlabeled meals (#141). Empty string is kept so the
 * field can be cleared without reseeding (#568). Do **not** trim here —
 * trimming on every keystroke swallowed trailing spaces and blocked
 * typing e.g. "Lunch 1" (#576). Persist via `persistedMealLabel` on Done. */
function customMealLabelOrUndefined(
  value: string,
  position: number,
  t: Dictionary,
): string | undefined {
  if (value === defaultMealLabel(t, position)) return undefined
  return value
}

/** #568/#576 — normalize label when flushing Done: trim, blank → unset,
 * trimmed-equal-to-default → unset (#141). */
function persistedMealLabel(
  value: string | undefined,
  position: number,
  t: Dictionary,
): string | undefined {
  const trimmed = value?.trim() ?? ''
  if (!trimmed || trimmed === defaultMealLabel(t, position)) return undefined
  return trimmed
}

interface MealListItemProps {
  entry: CalorieEntry
  position: number
  t: Dictionary
  locale: Locale
  isConfirmingDelete: boolean
  /** #792 — static gap from the previous meal; omitted when unknown. */
  sincePreviousMeal: ElapsedParts | null
  /** #461 — opens this meal in the shared AddMealDialog overlay (state-
   * controlled, no route navigation — see MealList's own onStartEdit
   * wiring) instead of the old #145 inline-fields expand-in-place. */
  onStartEdit: () => void
  onRequestDelete: () => void
  onConfirmDelete: () => void
  onCancelDelete: () => void
}

function MealListItem({
  entry,
  position,
  t,
  locale,
  isConfirmingDelete,
  sincePreviousMeal,
  onStartEdit,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
}: MealListItemProps) {
  const mealSlotTimes = useMealSlotDefaultTimesStore((state) => state.times)
  const builtinLabelOverrides = useEatingReasonTrackingStore(
    (state) => state.builtinLabelOverrides,
  )
  // #473: kcal leads this line instead of sitting in the header as a second
  // title-sized row of its own, and uses the single-initial macro names —
  // the full-word form wrapped to three lines in Russian at this width,
  // which was the whole reason the card felt cramped.
  const calorieSummary = macrosSummaryTextCompactWithCalories(
    calorieEntryKcal(entry),
    calorieEntryProtein(entry),
    calorieEntryFat(entry),
    calorieEntryCarbs(entry),
    locale,
    t,
  )
  const eatingReasons = mealEatingReasons(entry)

  if (isConfirmingDelete) {
    return (
      <li
        // #143: same card treatment (bg-card/ring) as the other two
        // MealListItem states below, so a meal doesn't lose its card
        // boundary mid-delete-confirm.
        className="flex items-center gap-2 rounded-xl bg-card p-3 ring-1 ring-foreground/10 whitespace-nowrap"
      >
        <span className="text-sm text-muted-foreground">
          {t.history.confirmDeleteLabel}
        </span>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={onConfirmDelete}
        >
          {t.history.confirmDeleteYes}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancelDelete}
        >
          {t.history.confirmDeleteNo}
        </Button>
      </li>
    )
  }

  return (
    <li
      // #143: card treatment (bg-card/ring), matching the app's existing
      // StatCard look ("This week's target"/"vs. yesterday") — was a plain
      // list row with no background/border before. #473 opened the row
      // spacing up (gap-2 → gap-3), the card reading as too condensed being
      // that report's underlying complaint.
      // #559 (Safari/PWA): flex + overflow-hidden clipped long names
      // instead of wrapping (Chrome emulator looked fine). CSS grid
      // columns are minmax(0,1fr) in Tailwind, so the line box is the
      // card width and break-normal wraps at spaces only — no
      // break-words (WebKit mid-splits Cyrillic, #555) and no
      // w-0/min-w-full (Safari used that for line breaking / clip).
      className="grid min-w-0 max-w-full grid-cols-1 gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10"
    >
      {/* #473: `{label} — {kcal} · {time}` was one flex line, so once it
       * ran out of width the text wrapped mid-cluster and the trailing
       * time collided with the edit/delete icons. Now the header carries
       * only the meal name (`min-w-0 flex-1`, free to wrap) with the time
       * pinned right beside the `shrink-0` icons; kcal moved down onto the
       * totals line below. */}
      <div className="flex min-w-0 items-start justify-between gap-2">
        <p className="min-w-0 flex-1 text-lg font-medium">
          {effectiveMealLabel(t, position, entry.label)}
        </p>
        {effectiveTimeEaten(entry, mealSlotTimes) && (
          <span className="shrink-0 pt-1 text-sm whitespace-nowrap text-muted-foreground">
            {effectiveTimeEaten(entry, mealSlotTimes)}
          </span>
        )}
        <div className="flex shrink-0 items-center gap-3">
          {/* #746 — Pencil then Trash (canonical Day/History order).
           * gap-3 matches Weight's display-mode pair and #127. */}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t.dailyEntry.editMealLabel(position)}
            onClick={onStartEdit}
          >
            <Pencil aria-hidden="true" />
          </Button>
          {/* Delete directly from the view row (#97) — previously only
           * reachable after opening edit mode first, unlike History's
           * EntryRow which already shows Pencil + Trash2 side by side.
           * Reuses the same two-step confirm flow (isConfirmingDelete). */}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t.dailyEntry.deleteMealLabel(position)}
            onClick={onRequestDelete}
          >
            <Trash2 aria-hidden="true" />
          </Button>
        </div>
      </div>
      {sincePreviousMeal && (
        // #796 — plain muted text under the meal name (not a bordered chip).
        <p className="min-w-0 text-sm tabular-nums text-muted-foreground">
          {t.dailyEntry.sinceLastMealOnCard(
            sincePreviousMeal.hours,
            sincePreviousMeal.minutes,
          )}
        </p>
      )}
      {entry.note && (
        <p className="min-w-0 text-sm text-muted-foreground">{entry.note}</p>
      )}
      {/* #473: one size up from the dish rows below (which stay text-sm),
       * now that the compact macro initials keep it to a single line. */}
      <p className="min-w-0 text-base text-muted-foreground">{calorieSummary}</p>
      {eatingReasons.length > 0 && (
        <p className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
          {eatingReasons.map((reason) => (
            <span
              key={reason}
              aria-hidden="true"
              className={cn(
                'size-2.5 shrink-0 rounded-full',
                isBuiltInEatingReason(reason)
                  ? EATING_REASON_DOT_CLASS[reason]
                  : 'bg-teal-500',
              )}
            />
          ))}
          <span>
            {formatEatingReasonsLine(
              eatingReasons,
              t,
              builtinLabelOverrides,
            )}
          </span>
        </p>
      )}
      {/* Item sub-list (#81) — a group's individual dishes, shown
       * underneath its own header/note/macro-total lines above. */}
      {/* #545/#555/#559: grid (not flex-col) so Safari gets a definite
       * column width; no pl-4 indent; wrap at spaces only. */}
      <ul className="grid min-w-0 max-w-full grid-cols-1 divide-y divide-foreground/15">
        {entry.items.map((item) => {
          const itemMacros = macrosSummaryTextCompact(
            item.proteinG,
            item.fatG,
            item.carbsG,
            locale,
            t,
          )
          // This dish's own reaction (#129) — no longer one shared reaction
          // for the whole meal.
          const itemEmotionOption = MEAL_EMOTIONS.find(
            (e) => e.value === item.emotion,
          )
          return (
            <li
              key={item.id}
              // #473: rebuilt on StatCard's own hierarchy (label → bold
              // value → muted description) instead of three lines at one
              // uniform size/tone, which is what made the list read as
              // condensed even after #464/#468's size passes.
              className="min-w-0 max-w-full space-y-0.5 py-3 text-sm text-muted-foreground first:pt-0 last:pb-0"
            >
              {/* #302: the title stands alone on its own row — kcal/amount/
               * macros/reaction all move down to a second row together,
               * rather than the title running inline into whatever
               * followed it. */}
              {item.name && (
                // Inherits the row's own muted tone rather than full
                // foreground (#473 follow-up) — at full strength the dish
                // names competed with the meal title above them. Size and
                // weight carry the hierarchy here, not color.
                <p className="min-w-0 max-w-full break-normal hyphens-none text-base font-medium">
                  {/* #559: NBSP from Level Kitchen / web paste must become
                   * real spaces or the whole phrase won't wrap. */}
                  {normalizeTextSpaces(item.name)}
                  {item.brand
                    ? ` (${normalizeTextSpaces(item.brand)})`
                    : ''}
                </p>
              )}
              <p className="flex items-baseline gap-1.5">
                <span className="text-xl font-semibold tabular-nums">
                  {formatNumber(item.amountKcal, locale, 0)}{' '}
                  {t.dailyEntry.kcalUnit}
                </span>
                {/* #206: this line otherwise never surfaces the item's own
                 * quantity anywhere — the only place it existed before was
                 * inside the add/edit form's own quantity input, gone once
                 * the item is saved. Omitted (not shown as "—") when unset,
                 * same as itemMacros/itemEmotionOption below, rather than
                 * cluttering every manually-typed item with no recorded
                 * quantity. */}
                {item.amountG !== undefined && (
                  <span>· {formatMacroGrams(item.amountG, locale, t)}</span>
                )}
              </p>
              {/* Own row, split from kcal/amount above (#462 follow-up) —
               * at the bigger #464 font size, kcal+amount+macros+reaction
               * all on one line wrapped mid-number on a phone width. */}
              {(itemMacros || itemEmotionOption) && (
                <p>
                  {itemMacros}
                  {itemEmotionOption && (
                    <>
                      {' '}
                      {/* leading-none removed (#156 follow-up) — see the
                       * matching comment on the edit-mode item row above. */}
                      <span aria-hidden="true" className="text-sm">
                        {itemEmotionOption.emoji}
                      </span>
                      <span className="sr-only">
                        {t.dailyEntry.mealEmotionLabel(item.emotion!)}
                      </span>
                    </>
                  )}
                </p>
              )}
              {/* #344 — this dish's own note, distinct from the meal
               * group's own note shown above the item list. Omitted when
               * unset, same as the other optional per-item details above. */}
              {item.noteText && <p>{item.noteText}</p>}
            </li>
          )
        })}
      </ul>
    </li>
  )
}

export interface MealListProps {
  calorieEntries: CalorieEntry[]
  /** Replaces the whole meal-group list on any add/edit/delete/reorder
   * (#145) — the caller decides how to persist it: `DailyEntryForm`
   * folds it into the day's react-hook-form state, `DayDetail` builds a
   * fresh `DailyEntry` and calls its own `onSaved`. `MealList` itself has
   * no idea which. */
  onChange: (next: CalorieEntry[]) => void
  /** This day's date — used for the "Repeat/Copy yesterday's meal(s)"
   * quick actions (fetches the day before this one). */
  date: string
  /** #549 — day-level totals (no food names), additive with meals. */
  dayTotals?: DayTotals
  /** #399 — the active goal's daily calorie target, when set. Threaded
   * into the add-row sheet and "Find food" dialog so the user can see how
   * many calories would be left, not just the running total, before
   * confirming an add. Omitted (no goal, or no target set) simply hides
   * that preview line — the existing running-total one is unaffected. */
  dailyCalorieTargetKcal?: number
}

/**
 * The meal-group list + bottom add row (#81/#96/#111/#122/#124), extracted
 * from `DailyEntryForm.tsx` (#145) so it can be mounted on its own —
 * originally the only way to reach this UI was inside the full daily-log
 * form, which meant editing a single already-logged meal from History
 * pulled in Weight/Sleep/Steps/Note too (`EntryRow.tsx`'s `alwaysEditable`
 * mode). `DailyEntryForm` still mounts this exactly as before; `DayDetail`
 * (History's read-only expand-row and the calendar day panel) now mounts
 * it too, so meals are editable there without ever needing "Edit day."
 * Owns all of its own local edit/add-row state — nothing here is
 * react-hook-form, so there's no dependency on a parent form instance.
 */
export function MealList({
  calorieEntries,
  onChange,
  date,
  dailyCalorieTargetKcal,
  dayTotals,
}: MealListProps) {
  const t = useTranslation()
  const locale = useLocale()
  const mealSlotTimes = useMealSlotDefaultTimesStore((state) => state.times)
  // #387 — reported live: a meal logged before this cutoff gets filed
  // under the *previous* day's own record (`effectiveDateFor`, #298), so
  // without this the toast's own day-pairing math would treat that
  // past-midnight meal as an early meal of that previous day instead of
  // its actual latest one. See fastingWindow.ts's own `adjustForDayStart`
  // comment for the full reasoning. #621 — also feeds the meal-list sort
  // below, for the identical reason.
  const dayStartTime = useDayStartStore((state) => state.dayStartTime)
  // #692 — opt-in; off by default so the full-width control doesn't
  // dominate empty days for people who rarely use it.
  const copyYesterdayMealsEnabled = useCopyYesterdayMealsStore(
    (state) => state.enabled,
  )
  // #791 — opt-in; off by default. Isolated child ticks seconds so this
  // list does not re-render every second.
  const sinceLastMealTimerEnabled = useSinceLastMealTimerStore(
    (state) => state.enabled,
  )
  // #597 — display earliest logged/effective time first (storage order
  // unchanged). #621 — day-start-adjusted, so a past-midnight meal sorts
  // after the evening it actually followed, not before it.
  const mealsInDisplayOrder = useMemo(
    () =>
      sortCalorieEntriesByLoggedTime(calorieEntries, mealSlotTimes, dayStartTime),
    [calorieEntries, mealSlotTimes, dayStartTime],
  )

  function setCalorieEntries(next: CalorieEntry[]) {
    onChange(next)
  }

  // #190: the day immediately before `date` — fetched to power "Repeat
  // yesterday's [meal]" on the add row. Not "today's real yesterday": for
  // a History-opened past day, this is that day's own prior day, so the
  // quick action stays correct wherever MealList is mounted.
  const previousDate = format(subDays(parseISO(date), 1), 'yyyy-MM-dd')
  const [previousDayEntry, setPreviousDayEntry] = useState<DailyEntry | null>(
    null,
  )
  useEffect(() => {
    let cancelled = false
    dailyEntryRepository
      .getByDate(previousDate)
      .then((result) => {
        if (!cancelled) setPreviousDayEntry(result ?? null)
      })
      .catch(() => {
        // Best-effort, same as usePastGoals/useMaxRecordedWeight — losing
        // the repeat-meal quick action for this render isn't worth
        // surfacing as an error state.
      })
    return () => {
      cancelled = true
    }
  }, [previousDate])

  // #287/#450/#456 — a quiet note shown whenever this day's first timed
  // meal and the previous day's last timed meal are both known, computed
  // as a plain derived value (not an action-triggered store, #456's own
  // "display constantly" ask) so it's automatically always correct: it
  // shows on page load if the condition already holds, recomputes live if
  // either side changes later (a save on *this* day, or `previousDayEntry`
  // resolving/updating after navigating between days — #450's own
  // retroactive-recalc case falls out of this for free), and never needs
  // an explicit dismiss/reconcile call at any save site. `useMemo` — not
  // recomputed on unrelated re-renders (opening a dialog, typing in
  // search), only when one of these actual inputs changes.
  const fastingWindowToastHours = useMemo(
    () =>
      previousDayEntry
        ? fastingHoursBetween(
            previousDayEntry,
            { calorieEntries },
            dayStartTime,
          )
        : null,
    [previousDayEntry, calorieEntries, dayStartTime],
  )
  const fastingWindowParts =
    fastingWindowToastHours === null
      ? null
      : hoursMinutesFromDecimalHours(fastingWindowToastHours)

  const lastMealAt = useMemo(() => {
    if (!sinceLastMealTimerEnabled) return null
    if (date !== todayIsoForDayStart(dayStartTime)) return null
    return resolveLastMealInstant({
      todayDate: date,
      todayEntries: calorieEntries,
      previousDate,
      previousEntries: previousDayEntry?.calorieEntries,
      dayStartTime,
      slotTimes: mealSlotTimes,
    })
  }, [
    sinceLastMealTimerEnabled,
    date,
    calorieEntries,
    previousDate,
    previousDayEntry,
    dayStartTime,
    mealSlotTimes,
  ])

  const gapsSincePrevious = useMemo(() => {
    if (!sinceLastMealTimerEnabled) return null
    return gapsSincePreviousMeal(
      mealsInDisplayOrder,
      date,
      previousDate,
      previousDayEntry?.calorieEntries,
      dayStartTime,
      mealSlotTimes,
    )
  }, [
    sinceLastMealTimerEnabled,
    mealsInDisplayOrder,
    date,
    previousDate,
    previousDayEntry,
    dayStartTime,
    mealSlotTimes,
  ])

  // #253: whole-day sibling of the above — CopyDayMealsDialog's own
  // preview/selective-pick sheet, extended over every meal group in the
  // source day instead of just the one at this position.
  const [isCopyDayDialogOpen, setIsCopyDayDialogOpen] = useState(false)
  // #454 — the whole "add a meal" flyout, replacing the old inline
  // accordion (isAddRowCollapsed/the add-row's own draft-field cluster).
  // `inProgressMealId` tracks which CalorieEntry the flyout is currently
  // building: null until the *first* item this session is actually added,
  // at which point a new entry is created and every subsequent add (search
  // pick, barcode scan, Repeat, recipe, manual entry) appends to that same
  // entry instead of creating a new one — the flyout stays open across
  // several single-dish adds (resolved via `AskUserQuestion`) rather than
  // closing after each one. `newMealPosition`/`newMealPreviousMeal` are
  // captured once at the moment the flyout opens (openAddMealDialog below),
  // not recomputed reactively — `calorieEntries.length` grows the instant
  // the first item lands, which would otherwise drift `previousMeal`
  // (keyed by position) to the *next* slot mid-session.
  const [isAddMealDialogOpen, setIsAddMealDialogOpen] = useState(false)
  const [inProgressMealId, setInProgressMealId] = useState<string | null>(null)
  const [newMealTime, setNewMealTime] = useState(currentTimeHHMM())
  const [newMealNote, setNewMealNote] = useState('')
  // #764 — seed before the first item creates the entry (same pattern as
  // newMealNote/newMealTime). Not copied from yesterday: situational.
  const [newMealEatingReasons, setNewMealEatingReasons] = useState<string[]>(
    [],
  )
  // #563 — custom label draft before the first item creates the entry
  // (same seed pattern as newMealTime/newMealNote).
  const [newMealLabel, setNewMealLabel] = useState<string | undefined>(
    undefined,
  )
  const [newMealPosition, setNewMealPosition] = useState(1)
  const [newMealPreviousMeal, setNewMealPreviousMeal] = useState<
    CalorieEntry | undefined
  >(undefined)
  // #491 — Done sets this so closing the dialog keeps the in-progress
  // meal; X / escape / overlay leave it false and we discard (#494 asks
  // first when that discard would drop foods already added this session).
  const keepInProgressMealRef = useRef(false)
  const [confirmDiscardAddMeal, setConfirmDiscardAddMeal] = useState(false)
  function openAddMealDialog() {
    setInProgressMealId(null)
    setNewMealTime(currentTimeHHMM())
    setNewMealNote('')
    setNewMealEatingReasons([])
    setNewMealPosition(calorieEntries.length + 1)
    const previous =
      previousDayEntry?.calorieEntries?.[calorieEntries.length]
    setNewMealPreviousMeal(previous)
    // #563 — seed from yesterday's same-position custom label (if any) so
    // the editable field matches what we'll persist on first add.
    setNewMealLabel(previous?.label)
    keepInProgressMealRef.current = false
    setConfirmDiscardAddMeal(false)
    setIsAddMealDialogOpen(true)
  }

  function discardInProgressMealAndClose() {
    if (inProgressMealId) {
      setCalorieEntries(
        calorieEntries.filter((entry) => entry.id !== inProgressMealId),
      )
    }
    keepInProgressMealRef.current = false
    setInProgressMealId(null)
    setConfirmDiscardAddMeal(false)
    setIsAddMealDialogOpen(false)
  }

  function closeAddMealDialog(open: boolean) {
    if (open) {
      setIsAddMealDialogOpen(true)
      return
    }
    if (keepInProgressMealRef.current) {
      keepInProgressMealRef.current = false
      // #568/#576 — blank / default-after-trim → unset for #141; skip write
      // when nothing needs normalizing so Done doesn't fire an extra onSave.
      if (inProgressMealId) {
        const inProgress = calorieEntries.find(
          (entry) => entry.id === inProgressMealId,
        )
        const normalizedLabel = persistedMealLabel(
          inProgress?.label,
          newMealPosition,
          t,
        )
        if (inProgress && inProgress.label !== normalizedLabel) {
          setCalorieEntries(
            calorieEntries.map((entry) =>
              entry.id === inProgressMealId
                ? { ...entry, label: normalizedLabel }
                : entry,
            ),
          )
        }
      }
      setInProgressMealId(null)
      setConfirmDiscardAddMeal(false)
      setIsAddMealDialogOpen(false)
      return
    }
    // #494 — foods already written into the day for this session; confirm
    // before silent discard. Empty flyout (no inProgressMealId yet) closes.
    if (inProgressMealId) {
      setConfirmDiscardAddMeal(true)
      return
    }
    setConfirmDiscardAddMeal(false)
    setIsAddMealDialogOpen(false)
  }
  // #461 — which already-saved meal (if any) is open for editing in the
  // shared AddMealDialog overlay, state-controlled like inProgressMealId
  // below rather than a dedicated route (#157, reverted): that route's
  // own goBack() called navigate(-1), unmounting this whole screen and
  // depending on browser/PWA history to bring it back — confirmed via
  // devtools that installed-standalone-iOS-PWA history handling is
  // unreliable enough to leave the page genuinely blank. This dialog
  // opening/closing is now just local state; TodayScreen/History never
  // unmount for it at all.
  // #509 — edits buffer in `editingMealDraft` until Done; Close discards
  // (with confirm when dirty) so X no longer silently commits deletes.
  const [editingMealId, setEditingMealId] = useState<string | null>(null)
  const [editingMealDraft, setEditingMealDraft] = useState<CalorieEntry | null>(
    null,
  )
  const editingMealBaselineRef = useRef<CalorieEntry | null>(null)
  const keepEditingChangesRef = useRef(false)
  const [confirmDiscardEditMeal, setConfirmDiscardEditMeal] = useState(false)
  const editingMeal = editingMealDraft
  const [confirmDeleteMealId, setConfirmDeleteMealId] = useState<string | null>(
    null,
  )

  // #600 — a short-lived undo toast after a meal delete commits, on top of
  // (not instead of) the existing two-step confirm before that delete
  // happens. Only the most recent delete is undoable — a second delete
  // while the toast is still up replaces the snapshot rather than
  // stacking, same "one at a time" shape as everywhere else in this app
  // that surfaces a single transient confirmation.
  const [undoDeletedMeal, setUndoDeletedMeal] = useState<{
    entry: CalorieEntry
    index: number
  } | null>(null)

  useEffect(() => {
    if (!undoDeletedMeal) return
    const timer = setTimeout(
      () => setUndoDeletedMeal(null),
      MEAL_DELETE_UNDO_WINDOW_MS,
    )
    return () => clearTimeout(timer)
  }, [undoDeletedMeal])

  function deleteMealById(id: string) {
    const index = calorieEntries.findIndex((entry) => entry.id === id)
    if (index === -1) return
    setUndoDeletedMeal({ entry: calorieEntries[index], index })
    setCalorieEntries(calorieEntries.filter((entry) => entry.id !== id))
  }

  function undoDeleteMeal() {
    if (!undoDeletedMeal) return
    const next = [...calorieEntries]
    next.splice(undoDeletedMeal.index, 0, undoDeletedMeal.entry)
    setCalorieEntries(next)
    setUndoDeletedMeal(null)
  }

  function cloneCalorieEntry(entry: CalorieEntry): CalorieEntry {
    return {
      ...entry,
      items: entry.items.map((item) => ({ ...item })),
    }
  }

  function clearEditingMealState() {
    setEditingMealId(null)
    setEditingMealDraft(null)
    editingMealBaselineRef.current = null
    keepEditingChangesRef.current = false
    setConfirmDiscardEditMeal(false)
  }

  function openEditingMeal(entryId: string) {
    const meal = calorieEntries.find((entry) => entry.id === entryId)
    if (!meal) return
    setEditingMealId(entryId)
    setEditingMealDraft(cloneCalorieEntry(meal))
    editingMealBaselineRef.current = cloneCalorieEntry(meal)
    keepEditingChangesRef.current = false
    setConfirmDiscardEditMeal(false)
  }

  function isEditingMealDirty(): boolean {
    if (!editingMealDraft || !editingMealBaselineRef.current) return false
    return (
      JSON.stringify(editingMealDraft) !==
      JSON.stringify(editingMealBaselineRef.current)
    )
  }

  function commitEditingMealAndClose() {
    if (!editingMealId || !editingMealDraft) {
      clearEditingMealState()
      return
    }
    const editPosition =
      calorieEntries.findIndex((entry) => entry.id === editingMealId) + 1
    const committed: CalorieEntry = {
      ...editingMealDraft,
      // #568/#576 — blank / default-after-trim → unset (positional default / #141).
      label: persistedMealLabel(editingMealDraft.label, editPosition, t),
      note: editingMealDraft.note?.trim() || undefined,
      timeEaten: editingMealDraft.timeEaten || undefined,
    }
    if (committed.items.length === 0) {
      setCalorieEntries(
        calorieEntries.filter((entry) => entry.id !== editingMealId),
      )
    } else {
      setCalorieEntries(
        calorieEntries.map((entry) =>
          entry.id === editingMealId ? committed : entry,
        ),
      )
    }
    clearEditingMealState()
  }

  function discardEditingMealAndClose() {
    clearEditingMealState()
  }

  function closeEditingMealDialog(open: boolean) {
    if (open) return
    if (keepEditingChangesRef.current) {
      commitEditingMealAndClose()
      return
    }
    if (isEditingMealDirty()) {
      setConfirmDiscardEditMeal(true)
      return
    }
    discardEditingMealAndClose()
  }

  // Reusable meal-name suggestions (#50) — loaded once per mount, a
  // library shared across days, not scoped to this entry. AddMealDialog
  // reads the store's own `items` directly; this only needs to keep it
  // warm and expose `touch` for copyDaySelectedGroups below.
  const loadMealItems = useMealItemStore((state) => state.loadItems)
  const touchMealItem = useMealItemStore((state) => state.touch)
  useEffect(() => {
    loadMealItems()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // #454 — the in-progress meal `AddMealDialog` is currently building, if
  // any (see inProgressMealId's own comment above for why the flyout stays
  // open across several adds instead of closing after each one).
  const inProgressMeal = calorieEntries.find(
    (entry) => entry.id === inProgressMealId,
  )

  // #566 — day totals for AddMealDialog previews must exclude the meal
  // whose `items` the dialog will add on top (otherwise remaining kcal is
  // subtracted twice after the first dish is saved into calorieEntries).
  function dayTotalsExcludingMeal(excludeId: string | null) {
    const others = excludeId
      ? calorieEntries.filter((entry) => entry.id !== excludeId)
      : calorieEntries
    return {
      kcal: totalCalories(others, dayTotals) ?? 0,
      proteinG: totalProtein(others, dayTotals) ?? 0,
      fatG: totalFat(others, dayTotals) ?? 0,
      carbsG: totalCarbs(others, dayTotals) ?? 0,
    }
  }

  // #663 — per-meal nutrition facts already satisfied by today's *other*
  // meals, so AddMealDialog's inline praise only surfaces a fact the first
  // time a meal hits it today (the "once per day per fact" cap), not again
  // for every later meal that also happens to qualify.
  function otherMealsSatisfiedFactIds(excludeId: string | null): NutritionFactId[] {
    const others = excludeId
      ? calorieEntries.filter((entry) => entry.id !== excludeId)
      : calorieEntries
    const facts = new Set<NutritionFactId>()
    for (const entry of others) {
      evaluateMealNutritionFacts({
        proteinG: calorieEntryProtein(entry) ?? 0,
        fatG: calorieEntryFat(entry) ?? 0,
        carbsG: calorieEntryCarbs(entry) ?? 0,
        fiberG: calorieEntryFiber(entry) ?? 0,
      }).forEach((id) => facts.add(id))
    }
    return Array.from(facts)
  }

  // Appends one or more items to the in-progress meal, creating it (a
  // fresh CalorieEntry) on the *first* call this session and appending to
  // that same entry's `items` on every subsequent call — same
  // replace-items-for-this-id shape saveEditMeal() below already uses for
  // an existing meal's own edit-mode Save, just applied to a freshly
  // created id instead of a previously-saved one. `AddMealDialog` itself
  // already handles touchMealItem for whichever of search/barcode/manual
  // entry/Repeat/recipe produced these items, so this only owns the
  // day's own `calorieEntries` array and the fasting-toast checks every
  // other add path already runs.
  function appendItemsToNewMeal(newItems: CalorieItem[]) {
    if (newItems.length === 0) return
    let nextEntries: CalorieEntry[]
    if (
      inProgressMealId &&
      calorieEntries.some((entry) => entry.id === inProgressMealId)
    ) {
      nextEntries = calorieEntries.map((entry) =>
        entry.id === inProgressMealId
          ? { ...entry, items: [...entry.items, ...newItems] }
          : entry,
      )
    } else {
      const newId = crypto.randomUUID()
      setInProgressMealId(newId)
      const created: CalorieEntry = {
        id: newId,
        items: newItems,
        label: newMealLabel,
        timeEaten: newMealTime || undefined,
        note: newMealNote.trim() || undefined,
        createdAt: new Date().toISOString(),
      }
      nextEntries = [
        ...calorieEntries,
        applyEatingReasons(created, newMealEatingReasons),
      ]
    }
    setCalorieEntries(nextEntries)
  }

  // #459 — lets the flyout's own "meal so far" list edit a mistakenly
  // mis-entered item in place, rather than deleting and re-adding it.
  function updateItemInNewMeal(updatedItem: CalorieItem) {
    if (!inProgressMealId) return
    setCalorieEntries(
      calorieEntries.map((entry) =>
        entry.id === inProgressMealId
          ? {
              ...entry,
              items: entry.items.map((item) =>
                item.id === updatedItem.id ? updatedItem : item,
              ),
            }
          : entry,
      ),
    )
  }

  // Lets the flyout's own "meal so far" list drop a mistakenly-added item
  // without leaving the dialog — same "a group with its last item removed
  // is itself removed" invariant CalorieEntry.items documents.
  function removeItemFromNewMeal(itemId: string) {
    if (!inProgressMealId) return
    setCalorieEntries(
      calorieEntries
        .map((entry) =>
          entry.id === inProgressMealId
            ? { ...entry, items: entry.items.filter((item) => item.id !== itemId) }
            : entry,
        )
        .filter((entry) => entry.id !== inProgressMealId || entry.items.length > 0),
    )
  }

  // #454 — the new whole-meal "was it tasty?" reaction, set from the
  // flyout's own footer once at least one item has been added.
  function setNewMealReaction(reaction: Emotion | undefined) {
    if (!inProgressMealId) return
    setCalorieEntries(
      calorieEntries.map((entry) =>
        entry.id === inProgressMealId ? { ...entry, reaction } : entry,
      ),
    )
  }

  // Time/note are editable in the flyout both *before* the first item lands
  // (where they're just seed values for appendItemsToNewMeal's own
  // entry-creation branch above) and *after*, once the entry already
  // exists — without also writing through to the live entry here, a change
  // made post-creation would only ever update the input's own display, not
  // the actually-saved CalorieEntry.
  function updateNewMealTime(value: string) {
    setNewMealTime(value)
    if (!inProgressMealId) return
    setCalorieEntries(
      calorieEntries.map((entry) =>
        entry.id === inProgressMealId
          ? { ...entry, timeEaten: value || undefined }
          : entry,
      ),
    )
  }
  function updateNewMealNote(value: string) {
    setNewMealNote(value)
    if (!inProgressMealId) return
    setCalorieEntries(
      calorieEntries.map((entry) =>
        entry.id === inProgressMealId
          ? { ...entry, note: value.trim() || undefined }
          : entry,
      ),
    )
  }

  function updateNewMealEatingReasons(reasons: string[]) {
    setNewMealEatingReasons(reasons)
    if (!inProgressMealId) return
    setCalorieEntries(
      calorieEntries.map((entry) =>
        entry.id === inProgressMealId
          ? applyEatingReasons(entry, reasons)
          : entry,
      ),
    )
  }

  // #563 — same before/after-first-item write-through as time/note.
  function updateNewMealLabel(value: string) {
    const custom = customMealLabelOrUndefined(value, newMealPosition, t)
    setNewMealLabel(custom)
    if (!inProgressMealId) return
    setCalorieEntries(
      calorieEntries.map((entry) =>
        entry.id === inProgressMealId ? { ...entry, label: custom } : entry,
      ),
    )
  }

  // #253: every meal from the source day with at least one item, for
  // "Copy yesterday's meals" — independent of the single-position matching
  // `previousMeal` above uses, and available regardless of how many meals
  // today already has.
  const previousDayMealGroups = (previousDayEntry?.calorieEntries ?? []).filter(
    (group) => group.items.length > 0,
  )

  // #253: mirrors repeatSelectedItems below, over several meal groups at
  // once instead of one — each selected group becomes its own new
  // CalorieEntry (fresh ids, dropping emotion), appended to today in a
  // single setCalorieEntries call rather than one per meal.
  function copyDaySelectedGroups(
    selectedGroups: { label: string | undefined; items: CalorieItem[] }[],
  ) {
    if (selectedGroups.length === 0) return
    const newEntries: CalorieEntry[] = selectedGroups.map((group) => ({
      id: crypto.randomUUID(),
      label: group.label,
      items: group.items.map((item) => ({
        ...item,
        id: crypto.randomUUID(),
        emotion: undefined,
      })),
      createdAt: new Date().toISOString(),
    }))
    setCalorieEntries([...calorieEntries, ...newEntries])
    for (const newEntry of newEntries) {
      for (const item of newEntry.items) {
        if (item.name && !curatedFoodNames.has(item.name)) {
          touchMealItem(item.name, {
            amountKcal: item.amountKcal,
            proteinG: item.proteinG,
            fatG: item.fatG,
            carbsG: item.carbsG,
            fiberG: item.fiberG,
            amountG: item.amountG,
          })
        }
      }
    }
  }

  // #461/#509 — editing an already-saved meal via the shared AddMealDialog
  // overlay. Mutations update `editingMealDraft` only; Done flushes to
  // `calorieEntries` (Close discards dirty drafts — see closeEditingMealDialog).
  function appendItemsToEditingMeal(newItems: CalorieItem[]) {
    if (!editingMealDraft || newItems.length === 0) return
    setEditingMealDraft({
      ...editingMealDraft,
      items: [...editingMealDraft.items, ...newItems],
    })
  }

  function updateItemInEditingMeal(updatedItem: CalorieItem) {
    if (!editingMealDraft) return
    setEditingMealDraft({
      ...editingMealDraft,
      items: editingMealDraft.items.map((item) =>
        item.id === updatedItem.id ? updatedItem : item,
      ),
    })
  }

  // Draft-only remove — emptying the draft does not delete the day meal
  // until Done (#509). Close restores the baseline.
  function removeItemFromEditingMeal(itemId: string) {
    if (!editingMealDraft) return
    setEditingMealDraft({
      ...editingMealDraft,
      items: editingMealDraft.items.filter((item) => item.id !== itemId),
    })
  }

  function setEditingMealReaction(reaction: Emotion | undefined) {
    if (!editingMealDraft) return
    setEditingMealDraft({ ...editingMealDraft, reaction })
  }

  function updateEditingMealTime(value: string) {
    if (!editingMealDraft) return
    setEditingMealDraft({
      ...editingMealDraft,
      timeEaten: value || undefined,
    })
  }

  // Raw value (not trimmed) — the input's value is read straight back from
  // `editingMeal.note`, so trimming on every keystroke would swallow a
  // trailing space mid-typing. Empty string still clears the field.
  function updateEditingMealNote(value: string) {
    if (!editingMealDraft) return
    setEditingMealDraft({
      ...editingMealDraft,
      note: value || undefined,
    })
  }

  function setEditingMealEatingReasons(reasons: string[]) {
    if (!editingMealDraft) return
    setEditingMealDraft(applyEatingReasons(editingMealDraft, reasons))
  }

  function updateEditingMealLabel(value: string) {
    if (!editingMealDraft || !editingMealId) return
    const position =
      calorieEntries.findIndex((entry) => entry.id === editingMealId) + 1
    setEditingMealDraft({
      ...editingMealDraft,
      label: customMealLabelOrUndefined(value, position, t),
    })
  }

  function deleteEditingMeal() {
    if (!editingMealId) return
    deleteMealById(editingMealId)
    clearEditingMealState()
  }

  function confirmDeleteMeal() {
    if (!confirmDeleteMealId) return
    deleteMealById(confirmDeleteMealId)
    if (editingMealId === confirmDeleteMealId) {
      clearEditingMealState()
    }
    setConfirmDeleteMealId(null)
  }

  return (
    <div className="grid min-w-0 max-w-full grid-cols-1 gap-3">
      {/* #600 — short-lived undo after a meal delete commits; see
       * `deleteMealById`/`undoDeleteMeal` above. */}
      {undoDeletedMeal && (
        <div
          role="status"
          className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground"
        >
          <span>{t.dailyEntry.mealDeletedToastMessage}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={undoDeleteMeal}
          >
            {t.dailyEntry.undoDeleteMealButton}
          </Button>
        </div>
      )}
      {fastingWindowParts && (
        // #456 — purely derived (see the useMemo above), so this note is
        // always accurate for whatever's currently on screen and has no
        // dismiss control of its own to go stale.
        // #794 — compact badge (border + muted fill), hours+minutes not
        // a one-decimal float. Left-aligned with the Meals heading.
        <p className="min-w-0">
          <span className="inline-block rounded-md border border-border bg-muted px-2 py-0.5 text-sm tabular-nums text-muted-foreground">
            {t.dailyEntry.fastingWindowToastMessage(
              fastingWindowParts.hours,
              fastingWindowParts.minutes,
            )}
          </span>
        </p>
      )}
      {mealsInDisplayOrder.length > 0 && (
        <ul className="grid min-w-0 max-w-full grid-cols-1 gap-3">
          {mealsInDisplayOrder.map((entry, index) => {
            // #597 — display order is by clock; positional default names /
            // "Edit meal N" stay tied to storage index so an untimed
            // Breakfast does not rename when a timed Lunch sorts above it.
            const position =
              calorieEntries.findIndex((candidate) => candidate.id === entry.id) +
              1
            return (
              <MealListItem
                key={entry.id}
                entry={entry}
                position={position}
                t={t}
                locale={locale}
                isConfirmingDelete={confirmDeleteMealId === entry.id}
                sincePreviousMeal={gapsSincePrevious?.[index] ?? null}
                // #461 — opens the shared AddMealDialog overlay for this
                // meal (state-controlled, see the render block below) —
                // no route navigation, so this screen never unmounts.
                onStartEdit={() => openEditingMeal(entry.id)}
                onRequestDelete={() => setConfirmDeleteMealId(entry.id)}
                onConfirmDelete={confirmDeleteMeal}
                onCancelDelete={() => setConfirmDeleteMealId(null)}
              />
            )
          })}
        </ul>
      )}

      {editingMeal && editingMealId && (
        <AddMealDialog
          open
          onOpenChange={closeEditingMealDialog}
          onDone={() => {
            keepEditingChangesRef.current = true
          }}
          isConfirmingDiscard={confirmDiscardEditMeal}
          onConfirmDiscard={discardEditingMealAndClose}
          onCancelDiscard={() => setConfirmDiscardEditMeal(false)}
          discardConfirmLabel={t.dailyEntry.confirmDiscardEditedMealLabel}
          showDoneWhenEmpty
          mealLabel={editableMealLabel(
            t,
            calorieEntries.findIndex((entry) => entry.id === editingMealId) + 1,
            editingMeal.label,
          )}
          onMealLabelChange={updateEditingMealLabel}
          mealPosition={
            calorieEntries.findIndex((entry) => entry.id === editingMealId) + 1
          }
          timeEaten={editingMeal.timeEaten ?? ''}
          onTimeEatenChange={updateEditingMealTime}
          note={editingMeal.note ?? ''}
          onNoteChange={updateEditingMealNote}
          items={editingMeal.items}
          reaction={editingMeal.reaction}
          onReactionChange={setEditingMealReaction}
          eatingReasons={mealEatingReasons(editingMeal)}
          onEatingReasonsChange={setEditingMealEatingReasons}
          onAppendItems={appendItemsToEditingMeal}
          onRemoveItem={removeItemFromEditingMeal}
          onUpdateItem={updateItemInEditingMeal}
          onDeleteMeal={deleteEditingMeal}
          // #566 — exclude the meal being edited; the dialog adds `items`
          // on top for remaining / "Today would be" previews.
          todayTotals={dayTotalsExcludingMeal(editingMealId)}
          dailyCalorieTargetKcal={dailyCalorieTargetKcal}
          alreadySatisfiedFactIds={otherMealsSatisfiedFactIds(editingMealId)}
        />
      )}

      {/* #253 — a day-level action, so it's independent of the add row's
       * own collapse state below and always offered (when available)
       * regardless of how many meals today already has.
       * #692 — gated behind Settings opt-in (default off). */}
      {copyYesterdayMealsEnabled && previousDayMealGroups.length > 0 && (
        <>
          <Button
            type="button"
            variant="outline"
            size="xl"
            className="w-full"
            onClick={() => setIsCopyDayDialogOpen(true)}
          >
            {t.dailyEntry.copyYesterdayMealsLabel}
          </Button>
          {isCopyDayDialogOpen && (
            <CopyDayMealsDialog
              open={isCopyDayDialogOpen}
              onOpenChange={setIsCopyDayDialogOpen}
              mealGroups={previousDayMealGroups}
              onConfirm={(selected) => {
                copyDaySelectedGroups(selected)
                setIsCopyDayDialogOpen(false)
              }}
            />
          )}
        </>
      )}

      {/* #454 — this used to be an inline accordion (a collapse/expand
       * toggle behind a whole card of triggers); now it's a single
       * trigger opening a dedicated full-screen flyout instead. */}
      {lastMealAt && <SinceLastMealTimer from={lastMealAt} />}
      <Button
        type="button"
        variant="outline"
        size="xl"
        className="w-full"
        onClick={openAddMealDialog}
      >
        {/* #691 — «another» / «ещё» only once the day already has a meal. */}
        {calorieEntries.length === 0
          ? t.dailyEntry.addMealLabel
          : t.dailyEntry.expandAddMealLabel}
      </Button>
      {isAddMealDialogOpen && (
        <AddMealDialog
          open={isAddMealDialogOpen}
          onOpenChange={closeAddMealDialog}
          onDone={() => {
            keepInProgressMealRef.current = true
          }}
          isConfirmingDiscard={confirmDiscardAddMeal}
          onConfirmDiscard={discardInProgressMealAndClose}
          onCancelDiscard={() => setConfirmDiscardAddMeal(false)}
          mealLabel={editableMealLabel(
            t,
            newMealPosition,
            inProgressMeal?.label ?? newMealLabel,
          )}
          onMealLabelChange={updateNewMealLabel}
          mealPosition={newMealPosition}
          timeEaten={newMealTime}
          onTimeEatenChange={updateNewMealTime}
          note={newMealNote}
          onNoteChange={updateNewMealNote}
          previousMeal={newMealPreviousMeal}
          items={inProgressMeal?.items ?? []}
          reaction={inProgressMeal?.reaction}
          onReactionChange={setNewMealReaction}
          eatingReasons={
            inProgressMeal
              ? mealEatingReasons(inProgressMeal)
              : newMealEatingReasons
          }
          onEatingReasonsChange={updateNewMealEatingReasons}
          onAppendItems={appendItemsToNewMeal}
          onRemoveItem={removeItemFromNewMeal}
          onUpdateItem={updateItemInNewMeal}
          // #566 — same as edit overlay: in-progress meal is already in
          // `calorieEntries` once the first dish is saved, and dialog
          // `items` re-adds those kcal in the remaining preview.
          todayTotals={dayTotalsExcludingMeal(inProgressMealId)}
          dailyCalorieTargetKcal={dailyCalorieTargetKcal}
          alreadySatisfiedFactIds={otherMealsSatisfiedFactIds(inProgressMealId)}
        />
      )}
    </div>
  )
}
