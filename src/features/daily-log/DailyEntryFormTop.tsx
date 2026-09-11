import { type FormEvent, useState } from 'react'
import { ChevronDown, CupSoda, GlassWater, X } from 'lucide-react'
import type { WaterEntry } from '@/domain/dailyEntry'
import { formatNumber } from '@/i18n'
import { parseNumberInput } from '@/shared/lib/parseNumberInput'
import { Button } from '@/shared/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/ui/collapsible'
import { Dialog, DialogContent, DialogTitle } from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { NumberInput } from '@/shared/ui/number-input'
import { StatCard } from '@/shared/ui/stat-card'
import { usePlannedMealsTrackingStore, useTodaySectionsCollapseStore } from '@/stores'
import { waterMlSchema } from './dailyEntryFormSchema'
import { MealList } from './MealList'
import { PlannedMealsSection } from './PlannedMealsSection'
import { useDailyEntryFormStateContext } from './useDailyEntryFormStateContext'
import { isUnusualDailyCalories } from './unusualEntryThresholds'

function formatWaterChipText(amountText: string, timeDrunk?: string): string {
  return timeDrunk ? `${amountText} · ${timeDrunk}` : amountText
}

function normalizeTimeHHMM(value: string): string | undefined {
  const hhmm = value.trim().slice(0, 5)
  if (!hhmm) return undefined
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(hhmm) ? hhmm : undefined
}

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
  // #626 — opt-in like cycle/digestion/water/alcohol tracking: reported
  // live right after #614 shipped that the feature's value wasn't obvious
  // without food search, so it moved behind a Settings toggle, off by
  // default, instead of always showing.
  const plannedMealsTrackingEnabled = usePlannedMealsTrackingStore(
    (state) => state.enabled,
  )
  const [editingWaterId, setEditingWaterId] = useState<string | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [editTime, setEditTime] = useState('')
  const [editAmountError, setEditAmountError] = useState<string | undefined>()
  const editingWater = state.waterEntries.find(
    (entry) => entry.id === editingWaterId,
  )

  function openWaterEdit(entry: WaterEntry) {
    setEditingWaterId(entry.id)
    setEditAmount(String(entry.amountMl))
    setEditTime(entry.timeDrunk ?? '')
    setEditAmountError(undefined)
  }

  function saveWaterEdit(event: FormEvent) {
    event.preventDefault()
    if (!editingWater) return
    let amountMl = editingWater.amountMl
    if (editAmount.trim() !== '') {
      const parsed = waterMlSchema.safeParse(parseNumberInput(editAmount))
      if (!parsed.success || parsed.data === 0) {
        setEditAmountError(t.dailyEntry.invalidValueMessage)
        return
      }
      amountMl = parsed.data
    }
    state.updateWaterEntry(editingWater.id, {
      amountMl,
      timeDrunk: normalizeTimeHHMM(editTime),
    })
    setEditingWaterId(null)
  }

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

      {/* #549/#575 — optional day-level kcal/macros without meal items;
       * additive with meals for Remaining. Hidden when What to track
       * turns Day totals off (saved data kept). Collapsible like Water. */}
      {state.trackedFields.dayTotals && (
      <div className="section-shell p-3">
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
                    {state.trackedFields.fiber && (
                      <NumberInput
                        label={t.dailyEntry.dayTotalsFiberLabel}
                        unit={t.dailyEntry.gramsUnit}
                        inputMode="numeric"
                        value={state.dayTotalsFiberInput}
                        onChange={(e) =>
                          state.setDayTotalsFiberInput(e.target.value)
                        }
                      />
                    )}
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

      {/* #258 — opt-in water tracking, gated by its own Settings toggle.
       * #271: each quick-add tap becomes its own removable entry instead of
       * bumping a single running total. #416: after Meals, ahead of Evening.
       * #476: bordered Collapsible accordion. #598: freeform ml input +
       * checkmark removed — glass/bottle quick-add + chips only. */}
      {state.waterTrackingEnabled && (
        <div
          id="water-entry-section"
          className="section-shell p-3"
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
                  // #488 — three chips per row was the volume-only layout.
                  // #849 adds HH:MM on the same chip (`500мл · 10:15`), so
                  // two columns keeps the time readable on a phone.
                  <div className="grid grid-cols-2 gap-2">
                    {state.waterEntries.map((entry) => {
                      const amountText = `${formatNumber(entry.amountMl, locale, 0)}${t.dailyEntry.mlUnit}`
                      const chipText = formatWaterChipText(
                        amountText,
                        entry.timeDrunk,
                      )
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
                          <button
                            type="button"
                            className="flex min-w-0 flex-1 items-center justify-center gap-1"
                            aria-label={t.dailyEntry.editWaterEntryLabel(
                              amountText,
                            )}
                            onClick={() => openWaterEdit(entry)}
                          >
                            <Icon
                              aria-hidden="true"
                              className="size-4 shrink-0 text-muted-foreground"
                            />
                            <span className="truncate">{chipText}</span>
                          </button>
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
          <Dialog
            open={editingWaterId !== null}
            onOpenChange={(open) => {
              if (!open) setEditingWaterId(null)
            }}
          >
            <DialogContent closeLabel={t.dailyEntry.closeFoodDialogLabel}>
              <DialogTitle>
                {t.dailyEntry.editWaterEntryDialogTitle}
              </DialogTitle>
              <form
                className="flex flex-col gap-3 pt-3"
                onSubmit={saveWaterEdit}
              >
                <NumberInput
                  label={t.dailyEntry.waterAmountLabel}
                  unit={t.dailyEntry.mlUnit}
                  value={editAmount}
                  error={editAmountError}
                  onChange={(event) => {
                    setEditAmount(event.target.value)
                    setEditAmountError(undefined)
                  }}
                />
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="water-entry-time">
                    {t.dailyEntry.timeEatenLabel}
                  </Label>
                  {/* #856 — NumberInput shell so native time can't outgrow Amount+мл. */}
                  <div className="relative min-w-0">
                    <Input
                      id="water-entry-time"
                      type="time"
                      aria-label={t.dailyEntry.timeEatenLabel}
                      value={editTime}
                      onChange={(event) => setEditTime(event.target.value)}
                      className="h-12 w-full max-w-full"
                    />
                  </div>
                </div>
                <Button type="submit" size="xl" className="w-full">
                  {t.dailyEntry.saveButton}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  )
}
