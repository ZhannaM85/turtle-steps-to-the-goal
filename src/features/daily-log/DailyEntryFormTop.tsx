import { CupSoda, GlassWater, X } from 'lucide-react'
import { formatNumber } from '@/i18n'
import { Button } from '@/shared/ui/button'
import { MealList } from './MealList'
import { useDailyEntryFormStateContext } from './useDailyEntryFormStateContext'
import { isUnusualDailyCalories } from './unusualEntryThresholds'

/**
 * #416/#419 — Meals and Water, which sit between the Morning
 * (`DailyEntryFormMorning`) and Evening (`DailyEntryFormBottom`) groups but
 * aren't part of either (#404) — they're ongoing logs, not single daily-value
 * fields. Split out of the original combined `DailyEntryForm.tsx` so
 * `TodayScreen.tsx` can render `DailyEntryFormMorning` on its own, elsewhere
 * in the tree (#419), while this and `DailyEntryFormBottom` still render
 * together further down — all three read the same live form state via
 * `DailyEntryFormStateContext`. `DailyEntryForm.tsx` (the combined default,
 * used by History's `EntryRow.tsx`) renders all three in one block,
 * unchanged from before this split.
 */
export function DailyEntryFormTop() {
  const state = useDailyEntryFormStateContext()
  const { t, locale } = state

  return (
    <>
      <div className="flex flex-col gap-1.5">
        {/* #218: a quiet inline note, not a blocking confirm — a day's
         * total crossing this threshold can't map to a single "save"
         * action to intercept the way the weight warning does, since it's
         * a running sum across however many meals get added throughout
         * the day. Disappears again on its own once an item is edited or
         * removed and the total drops back under the threshold. */}
        {isUnusualDailyCalories(state.dayTotalCalories) && (
          <p className="text-sm text-destructive">
            {t.dailyEntry.unusualDailyCaloriesWarning}
          </p>
        )}

        {/* Own field (#152) — was a text-xs caption line tucked under the
         * Calories card; promoted to the same labeled-field treatment as
         * Calories/Weight/Sleep use, just without a large number since it's
         * three values, not one. #156 follow-up briefly shrank this to
         * self-start/content-width to avoid empty bg-muted background past
         * the short text, but that made it visibly inconsistent in height
         * and width with every sibling field (#168) — Weight/Sleep already
         * have short left-aligned text in a full-width h-12 box without
         * reading as broken, so this now matches that same treatment
         * instead of being the one exception. */}
        {state.dayMacrosSummary && (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">
              {t.dailyEntry.macrosLabel}
            </span>
            <div className="flex h-12 items-center rounded-lg bg-muted px-3">
              <span className="text-sm text-foreground" aria-live="polite">
                {state.dayMacrosSummary}
              </span>
            </div>
          </div>
        )}

        {/* Meal editing extracted to its own component (#145) — reused
         * as-is by DayDetail.tsx too, so History's read-only expand-row can
         * edit/add/delete meals without needing this whole form. */}
        <MealList
          calorieEntries={state.calorieEntries}
          date={state.date}
          onChange={(next) => {
            state.setValue('calorieEntries', next, { shouldDirty: true })
            state.persist({ ...state.getValues(), calorieEntries: next })
          }}
          dailyCalorieTargetKcal={state.dailyCalorieTargetKcal}
        />
      </div>

      {/* #258 — opt-in water tracking, gated by its own Settings toggle.
       * #271: each add (quick-add button or manual entry + confirm)
       * becomes its own removable entry instead of bumping a single
       * running total the input quietly reflected — every add now gets a
       * persistent, visible marker. #416: moved here, after Meals, ahead
       * of the Evening group — stays ungrouped (like Meals above), not
       * folded into either the Morning or Evening group. */}
      {state.waterTrackingEnabled && (
        <div id="water-entry-section" className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">{t.dailyEntry.waterLabel}</span>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => state.addWaterEntry(250)}
            >
              {t.dailyEntry.addGlassLabel}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => state.addWaterEntry(500)}
            >
              {t.dailyEntry.addBottleLabel}
            </Button>
          </div>
          {state.waterEntries.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {state.waterEntries.map((entry) => {
                const amountText = `${formatNumber(entry.amountMl, locale, 0)}${t.dailyEntry.mlUnit}`
                // No literal "bottle" icon exists in lucide-react — CupSoda
                // is the closest distinct large-container icon available,
                // used for anything past a typical glass-sized add.
                const Icon = entry.amountMl > 300 ? CupSoda : GlassWater
                return (
                  <span
                    key={entry.id}
                    className="flex items-center gap-1 rounded-full bg-muted py-1 pr-1 pl-2.5 text-sm"
                  >
                    <Icon
                      aria-hidden="true"
                      className="size-4 text-muted-foreground"
                    />
                    {amountText}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label={t.dailyEntry.removeWaterEntryLabel(
                        amountText,
                      )}
                      onClick={() => state.removeWaterEntry(entry.id)}
                    >
                      <X aria-hidden="true" />
                    </Button>
                  </span>
                )
              })}
            </div>
          )}
        </div>
      )}
    </>
  )
}
