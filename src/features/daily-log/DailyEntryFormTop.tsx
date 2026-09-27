import { SectionAccordion } from '@/shared/ui/section-accordion'
import { DayPinFrame, DaySectionPinButton } from './DaySectionPin'
import { usePlannedMealsTrackingStore, useTodaySectionsCollapseStore } from '@/stores'
import { DayMacrosSection } from './DayMacrosSection'
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
  const { t } = state
  // #467/#468/#476/#511 — accordions; collapse shared with Day Collapse all.
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

      {/* #152/#467 — StatCards in the same accordion as the other Day
       * sections. #1029 — collapsed header keeps the compact line;
       * sticky/pin only while collapsed. */}
      <DayMacrosSection />

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
      <DayPinFrame id="meals">
      <SectionAccordion
        open={!mealsCollapsed}
        onOpenChange={(open) => setCollapsed('meals', !open)}
        title={t.dailyEntry.mealsLabel}
        expandLabel={t.dailyEntry.expandMealsLabel}
        collapseLabel={t.dailyEntry.collapseMealsLabel}
        contentClassName="min-w-0 max-w-full pt-3"
        actions={<DaySectionPinButton id="meals" />}
      >
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
      </SectionAccordion>
      </DayPinFrame>

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
