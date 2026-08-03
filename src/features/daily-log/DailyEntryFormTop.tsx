import { Check, ChevronDown, CupSoda, GlassWater, X } from 'lucide-react'
import { formatNumber } from '@/i18n'
import { Button } from '@/shared/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/ui/collapsible'
import { Input } from '@/shared/ui/input'
import { NumberInput } from '@/shared/ui/number-input'
import { StatCard } from '@/shared/ui/stat-card'
import { useTodaySectionsCollapseStore } from '@/stores'
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
  // #467/#468/#476/#511 — accordions; collapse shared with Day Collapse all.
  const macrosCollapsed = useTodaySectionsCollapseStore(
    (s) => s.sections.macros,
  )
  const mealsCollapsed = useTodaySectionsCollapseStore(
    (s) => s.sections.meals,
  )
  const dayTotalsCollapsed = useTodaySectionsCollapseStore(
    (s) => s.sections.dayTotals,
  )
  const waterCollapsed = useTodaySectionsCollapseStore(
    (s) => s.sections.water,
  )
  const setCollapsed = useTodaySectionsCollapseStore((s) => s.setCollapsed)

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
        <div className="rounded-lg border border-border p-3">
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

      {/* #549 — optional day-level kcal/macros without meal items; additive
       * with meals for Remaining cards and summaries. Collapsible like Water. */}
      <div className="rounded-lg border border-border p-3">
        <Collapsible
          open={!dayTotalsCollapsed}
          onOpenChange={(open) => setCollapsed('dayTotals', !open)}
        >
          <CollapsibleTrigger asChild>
            <button
              type="button"
              aria-label={
                dayTotalsCollapsed
                  ? t.dailyEntry.expandDayTotalsLabel
                  : t.dailyEntry.collapseDayTotalsLabel
              }
              className="group flex w-full items-center justify-between text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              {t.dailyEntry.dayTotalsLabel}
              <ChevronDown
                aria-hidden="true"
                className="size-4 transition-transform group-data-[state=open]:rotate-180"
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="flex flex-col gap-3 pt-3">
              <p className="text-xs text-muted-foreground">
                {t.dailyEntry.dayTotalsHint}
              </p>
              {state.isEditingDayTotals || state.dayTotals === undefined ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <NumberInput
                      label={t.dailyEntry.dayTotalsKcalLabel}
                      unit={t.dailyEntry.kcalUnit}
                      inputMode="numeric"
                      value={state.dayTotalsKcalInput}
                      onChange={(e) =>
                        state.setDayTotalsKcalInput(e.target.value)
                      }
                    />
                    <NumberInput
                      label={t.dailyEntry.dayTotalsProteinLabel}
                      unit={t.dailyEntry.gramsUnit}
                      inputMode="numeric"
                      value={state.dayTotalsProteinInput}
                      onChange={(e) =>
                        state.setDayTotalsProteinInput(e.target.value)
                      }
                    />
                    <NumberInput
                      label={t.dailyEntry.dayTotalsFatLabel}
                      unit={t.dailyEntry.gramsUnit}
                      inputMode="numeric"
                      value={state.dayTotalsFatInput}
                      onChange={(e) =>
                        state.setDayTotalsFatInput(e.target.value)
                      }
                    />
                    <NumberInput
                      label={t.dailyEntry.dayTotalsCarbsLabel}
                      unit={t.dailyEntry.gramsUnit}
                      inputMode="numeric"
                      value={state.dayTotalsCarbsInput}
                      onChange={(e) =>
                        state.setDayTotalsCarbsInput(e.target.value)
                      }
                    />
                  </div>
                  {state.dayTotalsError && (
                    <p className="text-sm text-destructive">
                      {state.dayTotalsError}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" onClick={state.saveDayTotals}>
                      {t.dailyEntry.saveDayTotalsLabel}
                    </Button>
                    {state.dayTotals !== undefined && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={state.clearDayTotals}
                      >
                        {t.dailyEntry.clearDayTotalsLabel}
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-2">
                  {state.dayTotalsSavedSummary && (
                    <p className="text-sm">{state.dayTotalsSavedSummary}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={state.startEditDayTotals}
                    >
                      {t.dailyEntry.editDayTotalsLabel}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={state.clearDayTotals}
                    >
                      {t.dailyEntry.clearDayTotalsLabel}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

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
            onOpenChange={(open) => setCollapsed('water', !open)}
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
                  <Input
                    type="text"
                    inputMode="numeric"
                    aria-label={t.dailyEntry.addWaterAmountLabel}
                    aria-invalid={state.waterInputError ? true : undefined}
                    className="h-12 w-24"
                    value={state.waterInput}
                    onChange={(e) => state.setWaterInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        state.saveWaterInput()
                      }
                    }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {t.dailyEntry.mlUnit}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-xl"
                    aria-label={t.dailyEntry.saveWaterLabel}
                    onClick={state.saveWaterInput}
                  >
                    <Check aria-hidden="true" />
                  </Button>
                </div>
                {state.waterInputError && (
                  <p className="text-sm text-destructive">
                    {state.waterInputError}
                  </p>
                )}
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
    </div>
  )
}
