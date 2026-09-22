import { Pencil, Trash2 } from 'lucide-react'
import type { CalorieEntry, EatingReason } from '@/domain/dailyEntry'
import {
  calorieEntryCarbs,
  calorieEntryFat,
  calorieEntryFiber,
  calorieEntryKcal,
  calorieEntryProtein,
  exactlyDaysBefore,
  isBuiltInEatingReason,
  mealEatingReasons,
} from '@/domain/dailyEntry'
import { evaluateMealNutritionFacts } from '@/domain/nutritionFacts'
import type { ElapsedParts } from '@/domain/stats'
import {
  formatLocalizedDate,
  formatNumber,
  type Dictionary,
  type Locale,
} from '@/i18n'
import { formatEatingReasonsLine } from '@/shared/lib/eatingReasonDisplay'
import { MEAL_EMOTIONS } from '@/shared/lib/emotionIcons'
import {
  formatKcal,
  formatMacroGrams,
  macrosSummaryTextCompact,
  macrosSummaryTextCompactWithCalories,
} from '@/shared/lib/macroDisplay'
import { effectiveMealLabel, effectiveTimeEaten } from '@/shared/lib/mealLabel'
import { normalizeTextSpaces } from '@/shared/lib/normalizeTextSpaces'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { ConfirmDeleteEntryBar } from './ConfirmDeleteEntryBar'
import {
  useEatingReasonTrackingStore,
  useMealSlotDefaultTimesStore,
  useNutritionFactsStore,
} from '@/stores'

/** #764 — Day-card dots for why this meal happened. */
const EATING_REASON_DOT_CLASS: Record<EatingReason, string> = {
  hunger: 'bg-reason-hunger',
  angry: 'bg-reason-angry',
  lonely: 'bg-reason-lonely',
  tired: 'bg-reason-tired',
  habit: 'bg-reason-habit',
  craving: 'bg-reason-craving',
  stress: 'bg-reason-stress',
  boredom: 'bg-reason-boredom',
  company: 'bg-reason-company',
}

function mealKcalComparisonLine(
  delta: number,
  baselineDate: string | null,
  viewedDate: string,
  locale: Locale,
  t: Dictionary,
): string {
  const arrow = delta < 0 ? '↓' : '↑'
  const amount = formatKcal(Math.abs(delta), locale, t)
  const namesYesterday =
    baselineDate === null || baselineDate === exactlyDaysBefore(viewedDate, 1)
  if (namesYesterday) {
    return t.dailyEntry.entryComparisonComparedToYesterday(arrow, amount)
  }
  const dateLabel = formatLocalizedDate(baselineDate, locale)
  if (!dateLabel) {
    return t.dailyEntry.entryComparisonComparedToYesterday(arrow, amount)
  }
  return t.dailyEntry.entryComparisonComparedToDate(arrow, amount, dateLabel)
}

export interface MealListItemProps {
  entry: CalorieEntry
  position: number
  t: Dictionary
  locale: Locale
  isConfirmingDelete: boolean
  /** #792 — static gap from the previous meal; omitted when unknown. */
  sincePreviousMeal: ElapsedParts | null
  /** ISO date of the day these cards belong to. */
  viewedDate: string
  /** #836/#977 — kcal vs the latest earlier same-label meal; omitted when
   * unknown or equal, or when the Settings toggle is off. */
  kcalVsYesterdayDelta: number | null
  /** ISO date of that earlier meal. Null when the delta line is hidden. */
  kcalBaselineDate: string | null
  /** #461 — opens this meal in the shared AddMealDialog overlay (state-
   * controlled, no route navigation — see MealList's own onStartEdit
   * wiring) instead of the old #145 inline-fields expand-in-place. */
  onStartEdit: () => void
  onRequestDelete: () => void
  onConfirmDelete: () => void
  onCancelDelete: () => void
}

export function MealListItem({
  entry,
  position,
  t,
  locale,
  isConfirmingDelete,
  sincePreviousMeal,
  viewedDate,
  kcalVsYesterdayDelta,
  kcalBaselineDate,
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
  const nutritionFactsEnabled = useNutritionFactsStore((state) => state.enabled)
  const mealNutritionFacts = nutritionFactsEnabled
    ? evaluateMealNutritionFacts({
        proteinG: calorieEntryProtein(entry) ?? 0,
        fatG: calorieEntryFat(entry) ?? 0,
        carbsG: calorieEntryCarbs(entry) ?? 0,
        fiberG: calorieEntryFiber(entry) ?? 0,
      })
    : []

  if (isConfirmingDelete) {
    return (
      <li className="min-w-0">
        <ConfirmDeleteEntryBar
          onConfirm={onConfirmDelete}
          onCancel={onCancelDelete}
        />
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
        <div className="flex shrink-0 items-center gap-1">
          {/* #746 — Pencil then Trash (canonical Day/History order).
           * #807 — gap-1 matches Weight title-row icons and ⓘ clusters. */}
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
      {kcalVsYesterdayDelta !== null && (
        // #836/#977 — quiet one-delta line under the macros summary. Less
        // than the prior meal is good (emerald), more is bad (orange) —
        // same tones as body/sleep entry comparisons (#664). Yesterday
        // keeps the "yesterday" wording; an older baseline names its date.
        <p
          className={cn(
            'min-w-0 text-xs',
            kcalVsYesterdayDelta < 0
              ? 'text-status-good'
              : 'text-status-warn',
          )}
        >
          {mealKcalComparisonLine(
            kcalVsYesterdayDelta,
            kcalBaselineDate,
            viewedDate,
            locale,
            t,
          )}
        </p>
      )}
      {mealNutritionFacts.length > 0 && (
        <div className="flex min-w-0 flex-col gap-1 text-sm text-muted-foreground">
          {mealNutritionFacts.map((factId) => (
            <p key={factId}>{t.nutritionFacts[factId]}</p>
          ))}
        </div>
      )}
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
                  : 'bg-reason-custom',
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
