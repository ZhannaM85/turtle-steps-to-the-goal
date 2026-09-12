import { ChevronDown } from 'lucide-react'
import { formatNumber } from '@/i18n'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/ui/collapsible'
import { StatCard } from '@/shared/ui/stat-card'
import { usePlannedMealsTrackingStore, useTodaySectionsCollapseStore } from '@/stores'
import { DayTotalsSection } from './DayTotalsSection'
import { MealList } from './MealList'
import { PlannedMealsSection } from './PlannedMealsSection'
import { useDailyEntryFormStateContext } from './useDailyEntryFormStateContext'
import { isUnusualDailyCalories } from './unusualEntryThresholds'
import { WaterLogSection } from './WaterLogSection'

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
 *
 * #860 — Day totals and Water live in their own section files so this
 * file stays under the 500-line source cap.
 */
export function DailyEntryFormTop() {
  const state = useDailyEntryFormStateContext()
  const { t, locale } = state
  // #467/#468/#476/#511 — accordions; collapse shared with Day Collapse all.
  const macrosCollapsed = useTodaySectionsCollapseStore(
    (s) => s.sections.macros,
  )
  const mealsCollapsed = useTodaySectionsCollapseStore(
    (s) => s.sections.meals,
  )
  const setCollapsed = useTodaySectionsCollapseStore((s) => s.setCollapsed)
  // #626 — opt-in like cycle/digestion/water/alcohol tracking: reported
  // live right after #614 shipped that the feature's value wasn't obvious
  // without food search, so it moved behind a Settings toggle, off by
  // default, instead of always showing.
  const plannedMealsTrackingEnabled = usePlannedMealsTrackingStore(
    (state) => state.enabled,
  )

  return (
    // #510 — same `gap-6` as TodayScreen's form-area / page column so
    // macros / meals / water shells aren't flush (`gap-1.5`) while peers
    // elsewhere use the larger rhythm. History's combined form uses the
    // same token via DailyEntryForm.
    <div className="flex flex-col gap-6">
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
        <div className="section-shell p-3">
          <Collapsible
            open={!macrosCollapsed}
            onOpenChange={(open) => setCollapsed('macros', !open)}
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

      {/* #549/#575 — optional day-level kcal/macros without meal items.
       * #860 chrome lives in DayTotalsSection. */}
      <DayTotalsSection />

      {/* Meal editing extracted to its own component (#145) — reused
       * as-is by DayDetail.tsx too, so History's read-only expand-row can
       * edit/add/delete meals without needing this whole form. #468:
       * wrapped in the same bordered `Collapsible` accordion the macros
       * cards above and TodayScreen's own Stats section use — reported
       * live as looking visually inconsistent with those otherwise (and
       * paired with removing the meal cards' own broken drag-to-reorder
       * handles, tracked separately as a future on-demand-mode
       * replacement in #471). */}
      <div className="section-shell p-3">
        <Collapsible
          open={!mealsCollapsed}
          onOpenChange={(open) => setCollapsed('meals', !open)}
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
            <div className="min-w-0 max-w-full pt-3">
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
                dayTotals={state.dayTotals}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {plannedMealsTrackingEnabled && (
        <PlannedMealsSection
          date={state.date}
          calorieEntries={state.calorieEntries}
          onChange={(next) => {
            state.setValue('calorieEntries', next, { shouldDirty: true })
            state.persist({ ...state.getValues(), calorieEntries: next })
          }}
        />
      )}

      <WaterLogSection />
    </div>
  )
}
