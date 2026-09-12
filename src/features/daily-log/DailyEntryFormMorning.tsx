import { ChevronDown, Sun } from 'lucide-react'
import { formatExactNumber } from '@/i18n'
import { isBlankSaveValue } from '@/shared/lib/isBlankSaveValue'
import { parseNumberInput } from '@/shared/lib/parseNumberInput'
import { splitHoursMinutes } from '@/shared/lib/sleepDuration'
import { Button } from '@/shared/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/ui/collapsible'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { useTodaySectionsCollapseStore } from '@/stores'
import {
  bodyFatPercentSchema,
  bodyWaterPercentSchema,
  boneMassKgSchema,
  muscleMassKgSchema,
  visceralFatRatingSchema,
} from './dailyEntryFormSchema'
import {
  EntryFieldComparisonInfo,
  EntryFieldComparisonLive,
} from './EntryFieldComparison'
import {
  DayFieldEditActions,
  DayFieldHeader,
  DayFieldViewActions,
} from './DayFieldHeader'
import { NoteDisplayBlock, NoteEditRow } from './NoteEditRow'
import { ConfirmDeleteEntryBar } from './ConfirmDeleteEntryBar'
import { AutoSleepScreenshotFillControl } from './autoSleepScreenshot/AutoSleepScreenshotFillControl'
import { useDailyEntryFormStateContext } from './useDailyEntryFormStateContext'
import { ZeppScreenshotFillControl } from './zeppScreenshot/ZeppScreenshotFillControl'

/**
 * #419 — the "Morning entries" group (Weight/Sleep/Body measurements/Body
 * composition, #404), split out of `DailyEntryFormTop.tsx` so it can render
 * on its own, right after `TodayScreen.tsx`'s Goal target card — reported
 * live as buried at the bottom of the page, past BMI/the deltas/the whole
 * reorderable stat-card group. `DailyEntryForm.tsx` (the combined default,
 * used by History's `EntryRow.tsx`) renders this first, immediately
 * followed by `DailyEntryFormTop` (Meals/Water) and `DailyEntryFormBottom`
 * (Evening) — unchanged there, still one contiguous block.
 */
export function DailyEntryFormMorning() {
  const state = useDailyEntryFormStateContext()
  const { t, locale } = state
  // #472/#511 — accordion; collapse shared with Day Collapse all control.
  const collapsed = useTodaySectionsCollapseStore(
    (s) => s.sections.morning,
  )
  const setCollapsed = useTodaySectionsCollapseStore((s) => s.setCollapsed)

  // #515 — the collapsed Body composition row, in the same field order as
  // the edit grid. All five are peers (one smart-scale reading), so none is
  // singled out as a headline value.
  const bodyCompositionMetrics = [
    {
      field: 'muscleMassKg' as const,
      label: t.dailyEntry.muscleMassShortLabel,
      unit: 'kg' as const,
      value:
        state.muscleMassKg === undefined
          ? '—'
          : `${formatExactNumber(state.muscleMassKg, locale)}${t.dailyEntry.kgUnit}`,
      numericValue: state.muscleMassKg,
    },
    {
      field: 'visceralFatRating' as const,
      label: t.dailyEntry.visceralFatShortLabel,
      unit: 'none' as const,
      value:
        state.visceralFatRating === undefined
          ? '—'
          : formatExactNumber(state.visceralFatRating, locale),
      numericValue: state.visceralFatRating,
    },
    {
      field: 'bodyWaterPercent' as const,
      label: t.dailyEntry.bodyWaterShortLabel,
      unit: 'percent' as const,
      value:
        state.bodyWaterPercent === undefined
          ? '—'
          : `${formatExactNumber(state.bodyWaterPercent, locale)}${t.dailyEntry.percentUnit}`,
      numericValue: state.bodyWaterPercent,
    },
    {
      field: 'boneMassKg' as const,
      label: t.dailyEntry.boneMassShortLabel,
      unit: 'kg' as const,
      value:
        state.boneMassKg === undefined
          ? '—'
          : `${formatExactNumber(state.boneMassKg, locale)}${t.dailyEntry.kgUnit}`,
      numericValue: state.boneMassKg,
    },
    {
      field: 'bodyFatPercent' as const,
      label: t.dailyEntry.bodyFatShortLabel,
      unit: 'percent' as const,
      value:
        state.bodyFatPercent === undefined
          ? '—'
          : `${formatExactNumber(state.bodyFatPercent, locale)}${t.dailyEntry.percentUnit}`,
      numericValue: state.bodyFatPercent,
    },
  ]

  // #435 — validates on blur in addition to `saveBodyComposition()`'s
  // existing Save-time check, reusing the exact same schema. Composed with
  // `register()`'s own `onBlur` (needed for react-hook-form's internal
  // touched/dirty tracking) rather than replacing it.
  function bodyCompositionFieldProps(
    field: Parameters<typeof state.validateBodyCompositionFieldOnBlur>[0],
    schema: Parameters<typeof state.validateBodyCompositionFieldOnBlur>[1],
  ) {
    const registered = state.register(field, { setValueAs: parseNumberInput })
    return {
      ...registered,
      onBlur: (event: Parameters<typeof registered.onBlur>[0]) => {
        void registered.onBlur(event)
        state.validateBodyCompositionFieldOnBlur(field, schema)
      },
    }
  }

  // #664 — sleep is typed as hours+minutes local state; convert for live compare.
  const sleepHoursText = parseNumberInput(state.sleepHoursPart)
  const sleepMinutesText = parseNumberInput(state.sleepMinutesPart)
  const liveSleepHours =
    sleepHoursText === undefined && sleepMinutesText === undefined
      ? undefined
      : (sleepHoursText ?? 0) + (sleepMinutesText ?? 0) / 60

  const comparison = state.entryComparisonBaselines

  return (
    <div className="section-shell p-3">
      <Collapsible
        open={!collapsed}
        onOpenChange={(open) => setCollapsed('morning', !open)}
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            aria-label={
              collapsed
                ? t.dailyEntry.expandMorningEntriesLabel
                : t.dailyEntry.collapseMorningEntriesLabel
            }
            className="group flex w-full flex-col gap-0.5 text-left"
          >
            <span className="flex items-center justify-between gap-1.5">
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <Sun aria-hidden="true" className="size-4" />
                {t.dailyEntry.morningEntriesTitle}
              </span>
              <ChevronDown
                aria-hidden="true"
                className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
              />
            </span>
            <span className="text-xs text-muted-foreground">
              {t.dailyEntry.morningEntriesSubtitle}
            </span>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="flex flex-col gap-4 pt-4">
            {state.isConfirmingDeleteWeight ? (
              // #670 — same two-step inline confirm shape as
              // MealListItem's/EntryRow's own confirmDelete states (muted
              // label + destructive Yes / ghost No) rather than a modal.
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">
                  {t.dailyEntry.weightLabel}
                </span>
                <div className="flex min-h-12 items-center gap-2 rounded-lg bg-muted px-3 py-2">
                  <span className="text-sm text-muted-foreground">
                    {t.history.confirmDeleteLabel}
                  </span>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={state.confirmDeleteWeight}
                  >
                    {t.history.confirmDeleteYes}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={state.cancelDeleteWeight}
                  >
                    {t.history.confirmDeleteNo}
                  </Button>
                </div>
              </div>
            ) : state.showWeightAsDisplay ? (
              <div className="flex flex-col gap-1.5">
                {/* #798 / #858 — pencil + trash on the title row (same as
                 * Sleep #752 / Body composition #750) so they stack in
                 * one column. Large #516 value stays in the muted card. */}
                <DayFieldHeader
                  label={
                    <>
                      {t.dailyEntry.weightLabel}
                      <EntryFieldComparisonInfo
                        field="weightKg"
                        currentValue={state.weightKg}
                        prior={comparison.prior('weightKg')}
                        day30Value={comparison.day30Value('weightKg')}
                        unit="kg"
                      />
                    </>
                  }
                  actions={
                    <DayFieldViewActions
                      editLabel={t.dailyEntry.editWeightLabel}
                      onEdit={() => state.setIsEditingWeight(true)}
                      deleteLabel={t.dailyEntry.deleteWeightLabel}
                      onDelete={state.requestDeleteWeight}
                      showDelete={state.canDeleteWeight}
                    />
                  }
                />
                <div className="flex min-h-12 items-center rounded-lg bg-muted px-3 py-2">
                  {/* #516 — Weight is the Day screen's primary morning
                   * figure (unlike body composition's five peers). Value
                   * sized up so the hierarchy is obvious at a glance. */}
                  <span className="flex min-w-0 items-baseline gap-1.5">
                    <span className="text-2xl font-semibold tabular-nums text-foreground">
                      {formatExactNumber(state.weightKg!, locale)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {t.common.kg}
                    </span>
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <DayFieldHeader
                  label={t.dailyEntry.weightLabel}
                  actions={
                    <DayFieldEditActions
                      saveLabel={t.dailyEntry.saveWeightLabel}
                      onSave={state.saveWeight}
                      cancelLabel={t.dailyEntry.cancelEditWeightLabel}
                      onCancel={state.cancelEditWeight}
                      showCancel={state.canCancelWeightEdit}
                      deleteLabel={t.dailyEntry.deleteWeightLabel}
                      onDelete={state.requestDeleteWeight}
                      showDelete={state.canDeleteWeight}
                    />
                  }
                />
                <Input
                  type="text"
                  inputMode="decimal"
                  aria-label={t.dailyEntry.weightLabel}
                  aria-invalid={state.errors.weightKg ? true : undefined}
                  className="h-12 w-full"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      state.saveWeight()
                    }
                  }}
                  {...state.register('weightKg', {
                    setValueAs: parseNumberInput,
                  })}
                />
                <EntryFieldComparisonLive
                  field="weightKg"
                  currentValue={state.weightKg}
                  prior={comparison.prior('weightKg')}
                  unit="kg"
                />
                {state.errors.weightKg && (
                  <p className="text-sm text-destructive">
                    {state.errors.weightKg.message}
                  </p>
                )}
                {/* #218: soft warning, not a hard block — weightSchema's own
                 * 20-400kg range already rejects an outright-impossible value
                 * before this ever renders; this catches a value still inside
                 * that range but unusual enough to likely be a typo (e.g. an
                 * extra digit). A second Save tap (same value) commits it
                 * anyway; Fix it just dismisses the warning to keep editing. */}
                {state.pendingUnusualWeight !== null && (
                  <div className="flex flex-col gap-2">
                    <p className="text-sm text-destructive">
                      {t.dailyEntry.unusualWeightWarning}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={state.saveWeight}
                      >
                        {t.dailyEntry.saveUnusualWeightAnywayLabel}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={state.discardUnusualWeightWarning}
                      >
                        {t.dailyEntry.fixWeightLabel}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {state.trackedFields.sleep &&
              (state.isConfirmingDeleteSleep ? (
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium">
                    {t.dailyEntry.sleepLabel}
                  </span>
                  <div className="flex min-h-12 items-center gap-2 rounded-lg bg-muted px-3 py-2">
                    <span className="text-sm text-muted-foreground">
                      {t.history.confirmDeleteLabel}
                    </span>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={state.confirmDeleteSleep}
                    >
                      {t.history.confirmDeleteYes}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={state.cancelDeleteSleep}
                    >
                      {t.history.confirmDeleteNo}
                    </Button>
                  </div>
                </div>
              ) : state.showSleepAsDisplay ? (
                <div className="flex flex-col gap-1.5">
                  {/* #752 / #858 — screenshot + pencil + trash on the
                   * title row so the duration card is text only. */}
                  <DayFieldHeader
                    label={
                      <>
                        {t.dailyEntry.sleepLabel}
                        <EntryFieldComparisonInfo
                          field="sleepHours"
                          currentValue={state.sleepHours}
                          prior={comparison.prior('sleepHours')}
                          day30Value={comparison.day30Value('sleepHours')}
                          unit="hours"
                        />
                      </>
                    }
                    actions={
                      <>
                        <AutoSleepScreenshotFillControl
                          asOfDate={state.date}
                          onConfirm={state.applySleepPatch}
                        />
                        <DayFieldViewActions
                          editLabel={t.dailyEntry.editSleepLabel}
                          onEdit={() => {
                            const parts = splitHoursMinutes(state.sleepHours)
                            const deepParts = splitHoursMinutes(
                              state.deepSleepHours,
                            )
                            state.setSleepHoursPart(parts.hours)
                            state.setSleepMinutesPart(parts.minutes)
                            state.setDeepSleepHoursPart(deepParts.hours)
                            state.setDeepSleepMinutesPart(deepParts.minutes)
                            state.setIsEditingSleep(true)
                          }}
                          deleteLabel={t.dailyEntry.deleteSleepLabel}
                          onDelete={state.requestDeleteSleep}
                          showDelete={state.canDeleteSleep}
                        />
                      </>
                    }
                  />
                  <div className="flex h-12 items-center rounded-lg bg-muted px-3">
                    <span className="text-sm text-foreground">
                      {t.dailyEntry.sleepSummary(
                        state.sleepHours === undefined
                          ? '—'
                          : `${splitHoursMinutes(state.sleepHours).hours}${t.dailyEntry.hoursUnit} ${splitHoursMinutes(state.sleepHours).minutes}${t.dailyEntry.minutesUnit}`,
                        state.deepSleepHours === undefined
                          ? '—'
                          : `${splitHoursMinutes(state.deepSleepHours).hours}${t.dailyEntry.hoursUnit} ${splitHoursMinutes(state.deepSleepHours).minutes}${t.dailyEntry.minutesUnit}`,
                      )}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <DayFieldHeader
                    label={t.dailyEntry.sleepLabel}
                    actions={
                      <>
                        <AutoSleepScreenshotFillControl
                          asOfDate={state.date}
                          onConfirm={state.applySleepPatch}
                        />
                        <DayFieldEditActions
                          saveLabel={t.dailyEntry.saveSleepLabel}
                          onSave={state.saveSleep}
                          cancelLabel={t.dailyEntry.cancelEditSleepLabel}
                          onCancel={state.cancelEditSleep}
                          showCancel={state.canCancelSleepEdit}
                          deleteLabel={t.dailyEntry.deleteSleepLabel}
                          onDelete={state.requestDeleteSleep}
                          showDelete={state.canDeleteSleep}
                        />
                      </>
                    }
                  />
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="flex flex-col gap-1">
                      <Label htmlFor="sleep-hours-part">
                        {t.dailyEntry.sleepHoursLabel}
                      </Label>
                      <div className="flex items-center gap-1">
                        <Input
                          id="sleep-hours-part"
                          type="text"
                          inputMode="numeric"
                          aria-label={`${t.dailyEntry.sleepHoursLabel} — ${t.dailyEntry.hoursFieldLabel}`}
                          aria-invalid={
                            state.errors.sleepHours ? true : undefined
                          }
                          className="h-12 w-12"
                          value={state.sleepHoursPart}
                          onChange={(e) =>
                            state.setSleepHoursPart(e.target.value)
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              state.saveSleep()
                            }
                          }}
                        />
                        <span className="text-xs text-muted-foreground">
                          {t.dailyEntry.hoursUnit}
                        </span>
                        <Input
                          type="text"
                          inputMode="numeric"
                          aria-label={`${t.dailyEntry.sleepHoursLabel} — ${t.dailyEntry.minutesFieldLabel}`}
                          aria-invalid={
                            state.errors.sleepHours ? true : undefined
                          }
                          className="h-12 w-12"
                          value={state.sleepMinutesPart}
                          onChange={(e) =>
                            state.setSleepMinutesPart(e.target.value)
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              state.saveSleep()
                            }
                          }}
                        />
                        <span className="text-xs text-muted-foreground">
                          {t.dailyEntry.minutesUnit}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label>{t.dailyEntry.deepSleepLabel}</Label>
                      <div className="flex items-center gap-1">
                        <Input
                          type="text"
                          inputMode="numeric"
                          aria-label={`${t.dailyEntry.deepSleepLabel} — ${t.dailyEntry.hoursFieldLabel}`}
                          aria-invalid={
                            state.errors.deepSleepHours ? true : undefined
                          }
                          className="h-12 w-12"
                          value={state.deepSleepHoursPart}
                          onChange={(e) =>
                            state.setDeepSleepHoursPart(e.target.value)
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              state.saveSleep()
                            }
                          }}
                        />
                        <span className="text-xs text-muted-foreground">
                          {t.dailyEntry.hoursUnit}
                        </span>
                        <Input
                          type="text"
                          inputMode="numeric"
                          aria-label={`${t.dailyEntry.deepSleepLabel} — ${t.dailyEntry.minutesFieldLabel}`}
                          aria-invalid={
                            state.errors.deepSleepHours ? true : undefined
                          }
                          className="h-12 w-12"
                          value={state.deepSleepMinutesPart}
                          onChange={(e) =>
                            state.setDeepSleepMinutesPart(e.target.value)
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              state.saveSleep()
                            }
                          }}
                        />
                        <span className="text-xs text-muted-foreground">
                          {t.dailyEntry.minutesUnit}
                        </span>
                      </div>
                    </div>
                  </div>
                  <EntryFieldComparisonLive
                    field="sleepHours"
                    currentValue={liveSleepHours}
                    prior={comparison.prior('sleepHours')}
                    unit="hours"
                  />
                  {(state.errors.sleepHours || state.errors.deepSleepHours) && (
                    <p className="text-sm text-destructive">
                      {state.errors.sleepHours?.message ??
                        state.errors.deepSleepHours?.message}
                    </p>
                  )}
                </div>
              ))}

            {/* #225: waist/hip/body fat bundled under one edit toggle, same
             * shape as the Sleep block above (one label, one Save button,
             * several sub-inputs) rather than three separate top-level fields
             * — these are all "the same kind of thing" (an occasional body
             * measurement), so a user updating one is likely updating the
             * others at the same time. #404: in the Morning group, alongside
             * Body composition — both are physical measurements typically
             * taken in the morning, same as Weight. */}
            {state.trackedFields.bodyMeasurements &&
              (state.isConfirmingDeleteBodyMeasurements ? (
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium">
                    {t.dailyEntry.bodyMeasurementsLabel}
                  </span>
                  <div className="flex min-h-12 items-center gap-2 rounded-lg bg-muted px-3 py-2">
                    <span className="text-sm text-muted-foreground">
                      {t.history.confirmDeleteLabel}
                    </span>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={state.confirmDeleteBodyMeasurements}
                    >
                      {t.history.confirmDeleteYes}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={state.cancelDeleteBodyMeasurements}
                    >
                      {t.history.confirmDeleteNo}
                    </Button>
                  </div>
                </div>
              ) : state.showBodyMeasurementsAsDisplay ? (
                <div className="flex flex-col gap-1.5">
                  <DayFieldHeader
                    label={t.dailyEntry.bodyMeasurementsLabel}
                    actions={
                      <DayFieldViewActions
                        editLabel={t.dailyEntry.editBodyMeasurementsLabel}
                        onEdit={() =>
                          state.setIsEditingBodyMeasurements(true)
                        }
                        deleteLabel={t.dailyEntry.deleteBodyMeasurementsLabel}
                        onDelete={state.requestDeleteBodyMeasurements}
                        showDelete={state.canDeleteBodyMeasurements}
                      />
                    }
                  />
                  <div className="flex h-12 items-center rounded-lg bg-muted px-3">
                    <span className="text-sm text-foreground">
                      {t.dailyEntry.bodyMeasurementsSummary(
                        state.waistCm === undefined
                          ? '—'
                          : `${formatExactNumber(state.waistCm, locale)}${t.dailyEntry.cmUnit}`,
                        state.hipCm === undefined
                          ? '—'
                          : `${formatExactNumber(state.hipCm, locale)}${t.dailyEntry.cmUnit}`,
                      )}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <DayFieldHeader
                    label={t.dailyEntry.bodyMeasurementsLabel}
                    actions={
                      <DayFieldEditActions
                        saveLabel={t.dailyEntry.saveBodyMeasurementsLabel}
                        onSave={state.saveBodyMeasurements}
                        cancelLabel={
                          t.dailyEntry.cancelEditBodyMeasurementsLabel
                        }
                        onCancel={state.cancelEditBodyMeasurements}
                        showCancel={state.canCancelBodyMeasurementsEdit}
                        deleteLabel={t.dailyEntry.deleteBodyMeasurementsLabel}
                        onDelete={state.requestDeleteBodyMeasurements}
                        showDelete={state.canDeleteBodyMeasurements}
                      />
                    }
                  />
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="flex flex-col gap-1">
                      <Label>{t.dailyEntry.waistLabel}</Label>
                      <div className="flex items-center gap-1">
                        <Input
                          type="text"
                          inputMode="decimal"
                          aria-label={`${t.dailyEntry.waistLabel} (${t.dailyEntry.cmUnit})`}
                          aria-invalid={state.errors.waistCm ? true : undefined}
                          className="h-12 w-16"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              state.saveBodyMeasurements()
                            }
                          }}
                          {...state.register('waistCm', {
                            setValueAs: parseNumberInput,
                          })}
                        />
                        <span className="text-xs text-muted-foreground">
                          {t.dailyEntry.cmUnit}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label>{t.dailyEntry.hipLabel}</Label>
                      <div className="flex items-center gap-1">
                        <Input
                          type="text"
                          inputMode="decimal"
                          aria-label={`${t.dailyEntry.hipLabel} (${t.dailyEntry.cmUnit})`}
                          aria-invalid={state.errors.hipCm ? true : undefined}
                          className="h-12 w-16"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              state.saveBodyMeasurements()
                            }
                          }}
                          {...state.register('hipCm', {
                            setValueAs: parseNumberInput,
                          })}
                        />
                        <span className="text-xs text-muted-foreground">
                          {t.dailyEntry.cmUnit}
                        </span>
                      </div>
                    </div>
                  </div>
                  {(state.errors.waistCm || state.errors.hipCm) && (
                    <p className="text-sm text-destructive">
                      {state.errors.waistCm?.message ??
                        state.errors.hipCm?.message}
                    </p>
                  )}
                </div>
              ))}

            {/* #233: muscle mass/visceral fat/body water/bone mass bundled
             * under one edit toggle, same shape as Body measurements above —
             * a distinct group since these come from a smart scale, not a
             * tape measure/caliper, but the same "occasional related numbers"
             * reasoning applies. #742: screenshot fill from Zepp Life in addition
             * to typing. */}
            {state.trackedFields.bodyComposition &&
              (state.isConfirmingDeleteBodyComposition ? (
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium">
                    {t.dailyEntry.bodyCompositionLabel}
                  </span>
                  <div className="flex min-h-12 items-center gap-2 rounded-lg bg-muted px-3 py-2">
                    <span className="text-sm text-muted-foreground">
                      {t.history.confirmDeleteLabel}
                    </span>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={state.confirmDeleteBodyComposition}
                    >
                      {t.history.confirmDeleteYes}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={state.cancelDeleteBodyComposition}
                    >
                      {t.history.confirmDeleteNo}
                    </Button>
                  </div>
                </div>
              ) : state.showBodyCompositionAsDisplay ? (
                <div className="flex flex-col gap-1.5">
                  {/* #750 / #858 — screenshot + pencil + trash on the
                   * title row so the five-value grid can use the full
                   * width underneath. */}
                  <DayFieldHeader
                    label={t.dailyEntry.bodyCompositionLabel}
                    actions={
                      <>
                        <ZeppScreenshotFillControl
                          asOfDate={state.date}
                          onConfirm={state.applyBodyCompositionPatch}
                        />
                        <DayFieldViewActions
                          editLabel={t.dailyEntry.editBodyCompositionLabel}
                          onEdit={() =>
                            state.setIsEditingBodyComposition(true)
                          }
                          deleteLabel={t.dailyEntry.deleteBodyCompositionLabel}
                          onDelete={state.requestDeleteBodyComposition}
                          showDelete={state.canDeleteBodyComposition}
                        />
                      </>
                    }
                  />
                  {/* #515 — two-row grid, each metric the same visual weight. */}
                  <div className="rounded-lg bg-muted px-3 py-2.5">
                    <dl className="grid grid-cols-3 gap-x-3 gap-y-2">
                      {bodyCompositionMetrics.map((metric) => (
                        <div
                          key={metric.label}
                          className="flex min-w-0 flex-col"
                        >
                          <dt className="flex min-w-0 items-center gap-0.5 truncate text-xs text-muted-foreground">
                            <span className="truncate">{metric.label}</span>
                            <EntryFieldComparisonInfo
                              field={metric.field}
                              currentValue={metric.numericValue}
                              prior={comparison.prior(metric.field)}
                              day30Value={comparison.day30Value(metric.field)}
                              unit={metric.unit}
                            />
                          </dt>
                          <dd className="text-sm font-medium tabular-nums text-foreground">
                            {metric.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <DayFieldHeader
                    label={t.dailyEntry.bodyCompositionLabel}
                    actions={
                      <>
                        <ZeppScreenshotFillControl
                          asOfDate={state.date}
                          onConfirm={state.applyBodyCompositionPatch}
                        />
                        <DayFieldEditActions
                          saveLabel={t.dailyEntry.saveBodyCompositionLabel}
                          onSave={state.saveBodyComposition}
                          cancelLabel={
                            t.dailyEntry.cancelEditBodyCompositionLabel
                          }
                          onCancel={state.cancelEditBodyComposition}
                          showCancel={state.canCancelBodyCompositionEdit}
                          deleteLabel={t.dailyEntry.deleteBodyCompositionLabel}
                          onDelete={state.requestDeleteBodyComposition}
                          showDelete={state.canDeleteBodyComposition}
                        />
                      </>
                    }
                  />
                  {/* #427 / #858 — 2-per-row grid of the five fields;
                   * ✓ / × / trash live on the title row so they no longer
                   * sit mid-grid. `w-fit` keeps columns sized to the
                   * narrow `w-16` inputs. #660 — `gap-y-4` keeps the gap
                   * between rows larger than each label's own `gap-1`. */}
                  <div className="grid w-fit grid-cols-[auto_auto] gap-x-6 gap-y-4">
                    <div className="col-start-1 row-start-1 flex flex-col gap-1">
                      {/* #446 — a fixed min-h reserves the same vertical space
                       * whether or not this particular label actually wraps, so
                       * every input in the row still starts at the same y
                       * position as its row siblings (a longer Russian label
                       * wrapping to 2 lines here used to push just *that*
                       * column's input down, misaligning it from the others in
                       * the same row). min-h-8 (32px) fits 2 lines at this
                       * text-xs size, the tallest any of these 5 labels wrap to.
                       * #660 — `flex items-end` bottom-aligns the label text
                       * within that reserved height, so a single-line label
                       * (most of these, in most locales) sits flush against
                       * its own input below instead of floating in the
                       * middle of the 32px box — which had been reading as
                       * roughly the same gap as the space to the *next*
                       * field's label. */}
                      <Label className="min-h-8 items-end">
                        {t.dailyEntry.muscleMassLabel}
                      </Label>
                      <div className="flex items-center gap-1">
                        <Input
                          type="text"
                          inputMode="decimal"
                          aria-label={`${t.dailyEntry.muscleMassLabel} (${t.dailyEntry.kgUnit})`}
                          aria-invalid={
                            state.errors.muscleMassKg ? true : undefined
                          }
                          className="h-12 w-16"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              state.saveBodyComposition()
                            }
                          }}
                          {...bodyCompositionFieldProps(
                            'muscleMassKg',
                            muscleMassKgSchema,
                          )}
                        />
                        <span className="text-xs text-muted-foreground">
                          {t.dailyEntry.kgUnit}
                        </span>
                      </div>
                      <EntryFieldComparisonLive
                        field="muscleMassKg"
                        currentValue={state.muscleMassKg}
                        prior={comparison.prior('muscleMassKg')}
                        unit="kg"
                      />
                    </div>
                    <div className="col-start-2 row-start-1 flex flex-col gap-1">
                      <Label className="min-h-8 items-end">
                        {t.dailyEntry.visceralFatLabel}
                      </Label>
                      <div className="flex items-center gap-1">
                        <Input
                          type="text"
                          inputMode="decimal"
                          aria-label={t.dailyEntry.visceralFatLabel}
                          aria-invalid={
                            state.errors.visceralFatRating ? true : undefined
                          }
                          className="h-12 w-16"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              state.saveBodyComposition()
                            }
                          }}
                          {...bodyCompositionFieldProps(
                            'visceralFatRating',
                            visceralFatRatingSchema,
                          )}
                        />
                      </div>
                      <EntryFieldComparisonLive
                        field="visceralFatRating"
                        currentValue={state.visceralFatRating}
                        prior={comparison.prior('visceralFatRating')}
                        unit="none"
                      />
                    </div>
                    <div className="col-start-1 row-start-2 flex flex-col gap-1">
                      <Label className="min-h-8 items-end">
                        {t.dailyEntry.bodyWaterLabel}
                      </Label>
                      <div className="flex items-center gap-1">
                        <Input
                          type="text"
                          inputMode="decimal"
                          aria-label={`${t.dailyEntry.bodyWaterLabel} (${t.dailyEntry.percentUnit})`}
                          aria-invalid={
                            state.errors.bodyWaterPercent ? true : undefined
                          }
                          className="h-12 w-16"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              state.saveBodyComposition()
                            }
                          }}
                          {...bodyCompositionFieldProps(
                            'bodyWaterPercent',
                            bodyWaterPercentSchema,
                          )}
                        />
                        <span className="text-xs text-muted-foreground">
                          {t.dailyEntry.percentUnit}
                        </span>
                      </div>
                      <EntryFieldComparisonLive
                        field="bodyWaterPercent"
                        currentValue={state.bodyWaterPercent}
                        prior={comparison.prior('bodyWaterPercent')}
                        unit="percent"
                      />
                    </div>
                    <div className="col-start-2 row-start-2 flex flex-col gap-1">
                      <Label className="min-h-8 items-end">
                        {t.dailyEntry.boneMassLabel}
                      </Label>
                      <div className="flex items-center gap-1">
                        <Input
                          type="text"
                          inputMode="decimal"
                          aria-label={`${t.dailyEntry.boneMassLabel} (${t.dailyEntry.kgUnit})`}
                          aria-invalid={
                            state.errors.boneMassKg ? true : undefined
                          }
                          className="h-12 w-16"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              state.saveBodyComposition()
                            }
                          }}
                          {...bodyCompositionFieldProps(
                            'boneMassKg',
                            boneMassKgSchema,
                          )}
                        />
                        <span className="text-xs text-muted-foreground">
                          {t.dailyEntry.kgUnit}
                        </span>
                      </div>
                      <EntryFieldComparisonLive
                        field="boneMassKg"
                        currentValue={state.boneMassKg}
                        prior={comparison.prior('boneMassKg')}
                        unit="kg"
                      />
                    </div>
                    <div className="col-start-1 row-start-3 flex flex-col gap-1">
                      <Label className="min-h-8 items-end">
                        {t.dailyEntry.bodyFatLabel}
                      </Label>
                      <div className="flex items-center gap-1">
                        <Input
                          type="text"
                          inputMode="decimal"
                          aria-label={`${t.dailyEntry.bodyFatLabel} (${t.dailyEntry.percentUnit})`}
                          aria-invalid={
                            state.errors.bodyFatPercent ? true : undefined
                          }
                          className="h-12 w-16"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              state.saveBodyComposition()
                            }
                          }}
                          {...bodyCompositionFieldProps(
                            'bodyFatPercent',
                            bodyFatPercentSchema,
                          )}
                        />
                        <span className="text-xs text-muted-foreground">
                          {t.dailyEntry.percentUnit}
                        </span>
                      </div>
                      <EntryFieldComparisonLive
                        field="bodyFatPercent"
                        currentValue={state.bodyFatPercent}
                        prior={comparison.prior('bodyFatPercent')}
                        unit="percent"
                      />
                    </div>
                  </div>
                  {(state.errors.muscleMassKg ||
                    state.errors.visceralFatRating ||
                    state.errors.bodyWaterPercent ||
                    state.errors.boneMassKg ||
                    state.errors.bodyFatPercent) && (
                    <p className="text-sm text-destructive">
                      {state.errors.muscleMassKg?.message ??
                        state.errors.visceralFatRating?.message ??
                        state.errors.bodyWaterPercent?.message ??
                        state.errors.boneMassKg?.message ??
                        state.errors.bodyFatPercent?.message}
                    </p>
                  )}
                  {/* #401 — same soft-warning shape as weight's own above: a
                   * second Save tap on unchanged values commits anyway, Fix it
                   * just dismisses to keep editing. */}
                  {state.pendingUnusualBodyComposition !== null && (
                    <div className="flex flex-col gap-2">
                      <p className="text-sm text-destructive">
                        {t.dailyEntry.unusualBodyCompositionWarning}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={state.saveBodyComposition}
                        >
                          {t.dailyEntry.saveUnusualBodyCompositionAnywayLabel}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={state.discardUnusualBodyCompositionWarning}
                        >
                          {t.dailyEntry.fixBodyCompositionLabel}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

            {state.trackedFields.morningNote &&
              (state.isConfirmingDeleteMorningNote ? (
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium">
                    {t.dailyEntry.morningNoteLabel}
                  </span>
                  <ConfirmDeleteEntryBar
                    onConfirm={state.confirmDeleteMorningNote}
                    onCancel={state.cancelDeleteMorningNote}
                  />
                </div>
              ) : state.showMorningNoteAsDisplay ? (
                <NoteDisplayBlock
                  label={t.dailyEntry.morningNoteLabel}
                  text={state.morningNote}
                  editLabel={t.dailyEntry.editMorningNoteLabel}
                  onEdit={() => state.setIsEditingMorningNote(true)}
                  canDelete={state.canDeleteMorningNote}
                  deleteLabel={t.dailyEntry.deleteMorningNoteLabel}
                  onDelete={state.requestDeleteMorningNote}
                />
              ) : (
                <div className="flex flex-col gap-1.5">
                  <NoteEditRow
                    label={t.dailyEntry.morningNoteLabel}
                    textareaProps={{
                      'aria-label': t.dailyEntry.morningNoteLabel,
                      'aria-invalid': state.errors.morningNote
                        ? true
                        : undefined,
                      placeholder: t.dailyEntry.morningNoteFieldPlaceholder,
                      ...state.register('morningNote'),
                    }}
                    saveLabel={t.dailyEntry.saveMorningNoteLabel}
                    onSave={state.saveMorningNote}
                    saveDisabled={isBlankSaveValue(state.morningNote)}
                    cancelLabel={t.dailyEntry.cancelEditMorningNoteLabel}
                    onCancel={state.cancelEditMorningNote}
                    hasSavedValue={state.canDeleteMorningNote}
                    deleteLabel={t.dailyEntry.deleteMorningNoteLabel}
                    onDelete={state.requestDeleteMorningNote}
                  />
                  {state.errors.morningNote && (
                    <p className="text-sm text-destructive">
                      {state.errors.morningNote.message}
                    </p>
                  )}
                </div>
              ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
