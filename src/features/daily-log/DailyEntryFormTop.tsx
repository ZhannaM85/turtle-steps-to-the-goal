import { ChevronDown, CupSoda, GlassWater, X } from 'lucide-react'
import { useState } from 'react'
import { formatNumber } from '@/i18n'
import { Button } from '@/shared/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/ui/collapsible'
import { StatCard } from '@/shared/ui/stat-card'
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
  // #467 — accordion wrapping the two macros StatCards below, same
  // bordered-Collapsible pattern TodayScreen's own Stats section uses.
  const [macrosCollapsed, setMacrosCollapsed] = useState(false)
  // #468 — same pattern again, wrapping the meal list.
  const [mealsCollapsed, setMealsCollapsed] = useState(false)
  // #476 — same pattern again, wrapping the water quick-add + chips
  // (was left ungrouped on purpose in #416 when Meals was also plain;
  // Meals gained the accordion in #468, so Water was the odd one out).
  const [waterCollapsed, setWaterCollapsed] = useState(false)

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
         * Calories/Weight/Sleep use. #467: rebuilt on `StatCard` (the same
         * big-number + description shape the Stats section's own cards
         * use, kcal as the value, protein/fat/carbs as the description)
         * instead of a plain `Card`, wrapped in the same bordered
         * `Collapsible` accordion TodayScreen's Stats section uses —
         * reported live as looking visually inconsistent with those
         * cards otherwise. */}
        {(state.dayMacrosSummary || state.dayRemainingMacrosSummary) && (
          <div className="rounded-lg border border-border p-3">
            <Collapsible
              open={!macrosCollapsed}
              onOpenChange={(open) => setMacrosCollapsed(!open)}
            >
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  aria-label={
                    macrosCollapsed
                      ? t.dailyEntry.expandMacrosLabel
                      : t.dailyEntry.collapseMacrosLabel
                  }
                  className="group flex w-full items-center justify-between text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  {t.dailyEntry.macrosLabel}
                  <ChevronDown
                    aria-hidden="true"
                    className="size-4 transition-transform group-data-[state=open]:rotate-180"
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="flex flex-col gap-6 pt-3">
                  {state.dayMacrosSummary && (
                    <StatCard
                      label={t.dailyEntry.consumedMacrosLabel}
                      value={formatNumber(state.dayTotalCalories, locale, 0)}
                      unit={t.dailyEntry.kcalUnit}
                      description={state.dayMacrosDescription ?? undefined}
                    />
                  )}
                  {state.dayRemainingMacrosSummary && (
                    <StatCard
                      label={t.dailyEntry.remainingMacrosLabel}
                      value={
                        state.remainingKcal !== undefined
                          ? formatNumber(state.remainingKcal, locale, 0)
                          : '—'
                      }
                      unit={t.dailyEntry.kcalUnit}
                      description={
                        state.dayRemainingMacrosDescription ?? undefined
                      }
                    />
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

        {/* Meal editing extracted to its own component (#145) — reused
         * as-is by DayDetail.tsx too, so History's read-only expand-row can
         * edit/add/delete meals without needing this whole form. #468:
         * wrapped in the same bordered `Collapsible` accordion the macros
         * cards above and TodayScreen's own Stats section use — reported
         * live as looking visually inconsistent with those otherwise (and
         * paired with removing the meal cards' own broken drag-to-reorder
         * handles, tracked separately as a future on-demand-mode
         * replacement in #471). */}
        <div className="rounded-lg border border-border p-3">
          <Collapsible
            open={!mealsCollapsed}
            onOpenChange={(open) => setMealsCollapsed(!open)}
          >
            <CollapsibleTrigger asChild>
              <button
                type="button"
                aria-label={
                  mealsCollapsed
                    ? t.dailyEntry.expandMealsLabel
                    : t.dailyEntry.collapseMealsLabel
                }
                className="group flex w-full items-center justify-between text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                {t.dailyEntry.mealsLabel}
                <ChevronDown
                  aria-hidden="true"
                  className="size-4 transition-transform group-data-[state=open]:rotate-180"
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="pt-3">
                <MealList
                  calorieEntries={state.calorieEntries}
                  date={state.date}
                  onChange={(next) => {
                    state.setValue('calorieEntries', next, {
                      shouldDirty: true,
                    })
                    state.persist({ ...state.getValues(), calorieEntries: next })
                  }}
                  dailyCalorieTargetKcal={state.dailyCalorieTargetKcal}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>

      {/* #258 — opt-in water tracking, gated by its own Settings toggle.
       * #271: each add (quick-add button or manual entry + confirm)
       * becomes its own removable entry instead of bumping a single
       * running total the input quietly reflected — every add now gets a
       * persistent, visible marker. #416: moved here, after Meals, ahead
       * of the Evening group — not folded into Morning or Evening.
       * #476: wrapped in the same bordered `Collapsible` accordion the
       * macros (#467) / meals (#468) sections above use — was the last
       * plain unbordered block between those and Evening (#472). */}
      {state.waterTrackingEnabled && (
        <div
          id="water-entry-section"
          className="rounded-lg border border-border p-3"
        >
          <Collapsible
            open={!waterCollapsed}
            onOpenChange={(open) => setWaterCollapsed(!open)}
          >
            <CollapsibleTrigger asChild>
              <button
                type="button"
                aria-label={
                  waterCollapsed
                    ? t.dailyEntry.expandWaterLabel
                    : t.dailyEntry.collapseWaterLabel
                }
                className="group flex w-full items-center justify-between text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                {t.dailyEntry.waterLabel}
                <ChevronDown
                  aria-hidden="true"
                  className="size-4 transition-transform group-data-[state=open]:rotate-180"
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="flex flex-col gap-1.5 pt-3">
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
                  // #488 — three chips per row on phone (was ~2 with
                  // flex-wrap); each chip fills its grid cell.
                  <div className="grid grid-cols-3 gap-2">
                    {state.waterEntries.map((entry) => {
                      const amountText = `${formatNumber(entry.amountMl, locale, 0)}${t.dailyEntry.mlUnit}`
                      // No literal "bottle" icon exists in lucide-react —
                      // CupSoda is the closest distinct large-container
                      // icon available, used for anything past a typical
                      // glass-sized add.
                      const Icon =
                        entry.amountMl > 300 ? CupSoda : GlassWater
                      return (
                        <span
                          key={entry.id}
                          className="flex min-w-0 items-center justify-center gap-1 rounded-full bg-muted py-1 pr-1 pl-2 text-sm"
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
                            onClick={() =>
                              state.removeWaterEntry(entry.id)
                            }
                          >
                            <X aria-hidden="true" />
                          </Button>
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}
    </>
  )
}
