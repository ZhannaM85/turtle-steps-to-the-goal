import { Check, ChevronDown, Pencil, Sun, X } from 'lucide-react'
import { formatExactNumber } from '@/i18n'
import { splitHoursMinutes } from '@/shared/lib/sleepDuration'
import { parseNumberInput } from '@/shared/lib/parseNumberInput'
import { Button } from '@/shared/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/ui/collapsible'
import { Input } from '@/shared/ui/input'
import { useTodaySectionsCollapseStore } from '@/stores'
import {
  bodyFatPercentSchema,
  bodyWaterPercentSchema,
  boneMassKgSchema,
  muscleMassKgSchema,
  visceralFatRatingSchema,
} from './dailyEntryFormSchema'
import { useDailyEntryFormStateContext } from './useDailyEntryFormStateContext'

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

  return (
    <div className="rounded-lg border border-border p-3">
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
            {state.showWeightAsDisplay ? (
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">
                  {t.dailyEntry.weightLabel}
                </span>
                <div className="flex h-12 items-center justify-between rounded-lg bg-muted px-3">
                  <span className="text-sm text-foreground">
                    {formatExactNumber(state.weightKg!, locale)} {t.common.kg}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xl"
                    aria-label={t.dailyEntry.editWeightLabel}
                    onClick={() => state.setIsEditingWeight(true)}
                  >
                    <Pencil aria-hidden="true" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">
                  {t.dailyEntry.weightLabel}
                </span>
                <div className="flex items-center gap-3">
                  <Input
                    type="text"
                    inputMode="decimal"
                    aria-label={t.dailyEntry.weightLabel}
                    aria-invalid={state.errors.weightKg ? true : undefined}
                    className="h-12 flex-1"
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
                  {/* #424 — leave edit mode without saving, same affordance
                   * MealList.tsx's #169 Cancel button already established. Hidden
                   * when there's no established value to actually revert to (a
                   * brand-new entry auto-opens here with nothing saved yet). */}
                  {state.canCancelWeightEdit && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xl"
                      aria-label={t.dailyEntry.cancelEditWeightLabel}
                      onClick={state.cancelEditWeight}
                    >
                      <X aria-hidden="true" />
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-xl"
                    aria-label={t.dailyEntry.saveWeightLabel}
                    onClick={state.saveWeight}
                  >
                    <Check aria-hidden="true" />
                  </Button>
                </div>
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
              (state.showSleepAsDisplay ? (
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium">
                    {t.dailyEntry.sleepLabel}
                  </span>
                  <div className="flex h-12 items-center justify-between rounded-lg bg-muted px-3">
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
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xl"
                      aria-label={t.dailyEntry.editSleepLabel}
                      onClick={() => {
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
                    >
                      <Pencil aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium">
                    {t.dailyEntry.sleepLabel}
                  </span>
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-muted-foreground">
                        {t.dailyEntry.sleepHoursLabel}
                      </span>
                      <div className="flex items-center gap-1">
                        <Input
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
                      <span className="text-xs text-muted-foreground">
                        {t.dailyEntry.deepSleepLabel}
                      </span>
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
                    {/* #424 */}
                    {state.canCancelSleepEdit && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xl"
                        aria-label={t.dailyEntry.cancelEditSleepLabel}
                        onClick={state.cancelEditSleep}
                      >
                        <X aria-hidden="true" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-xl"
                      aria-label={t.dailyEntry.saveSleepLabel}
                      onClick={state.saveSleep}
                    >
                      <Check aria-hidden="true" />
                    </Button>
                  </div>
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
              (state.showBodyMeasurementsAsDisplay ? (
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium">
                    {t.dailyEntry.bodyMeasurementsLabel}
                  </span>
                  <div className="flex h-12 items-center justify-between rounded-lg bg-muted px-3">
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
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xl"
                      aria-label={t.dailyEntry.editBodyMeasurementsLabel}
                      onClick={() => state.setIsEditingBodyMeasurements(true)}
                    >
                      <Pencil aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium">
                    {t.dailyEntry.bodyMeasurementsLabel}
                  </span>
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-muted-foreground">
                        {t.dailyEntry.waistLabel}
                      </span>
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
                      <span className="text-xs text-muted-foreground">
                        {t.dailyEntry.hipLabel}
                      </span>
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
                    {/* #424 */}
                    {state.canCancelBodyMeasurementsEdit && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xl"
                        aria-label={
                          t.dailyEntry.cancelEditBodyMeasurementsLabel
                        }
                        onClick={state.cancelEditBodyMeasurements}
                      >
                        <X aria-hidden="true" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-xl"
                      aria-label={t.dailyEntry.saveBodyMeasurementsLabel}
                      onClick={state.saveBodyMeasurements}
                    >
                      <Check aria-hidden="true" />
                    </Button>
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
             * reasoning applies. Manual entry only, no device integration. */}
            {state.trackedFields.bodyComposition &&
              (state.showBodyCompositionAsDisplay ? (
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium">
                    {t.dailyEntry.bodyCompositionLabel}
                  </span>
                  {/* #515 — five equal-weight metrics in the old fixed h-12
                   * line wrapped like accidental overflow on mobile. Keep the
                   * Morning display shell, but borrow StatCard's hierarchy:
                   * body fat is the primary figure and the other smart-scale
                   * readings form a deliberately quieter description. */}
                  <div className="flex min-h-20 items-center justify-between gap-2 rounded-lg bg-muted px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-semibold tabular-nums text-foreground">
                          {state.bodyFatPercent === undefined
                            ? '—'
                            : formatExactNumber(state.bodyFatPercent, locale)}
                        </span>
                        {state.bodyFatPercent !== undefined && (
                          <span className="text-sm text-muted-foreground">
                            {t.dailyEntry.percentUnit}
                          </span>
                        )}
                        <span className="text-sm text-muted-foreground">
                          {t.dailyEntry.bodyFatLabel}
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {t.dailyEntry.bodyCompositionSummary(
                          state.muscleMassKg === undefined
                            ? '—'
                            : `${formatExactNumber(state.muscleMassKg, locale)}${t.dailyEntry.kgUnit}`,
                          state.visceralFatRating === undefined
                            ? '—'
                            : formatExactNumber(
                                state.visceralFatRating,
                                locale,
                              ),
                          state.bodyWaterPercent === undefined
                            ? '—'
                            : `${formatExactNumber(state.bodyWaterPercent, locale)}${t.dailyEntry.percentUnit}`,
                          state.boneMassKg === undefined
                            ? '—'
                            : `${formatExactNumber(state.boneMassKg, locale)}${t.dailyEntry.kgUnit}`,
                        )}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xl"
                      aria-label={t.dailyEntry.editBodyCompositionLabel}
                      onClick={() => state.setIsEditingBodyComposition(true)}
                    >
                      <Pencil aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium">
                    {t.dailyEntry.bodyCompositionLabel}
                  </span>
                  {/* #427 — 5 fields plus the Save button don't wrap evenly in a
                   * single `flex flex-wrap` row the way Sleep's 2/Body
                   * measurements' 2 do (2 then 3, stranding the button on its
                   * own line). A fixed 2-per-row grid keeps every field's
                   * position predictable regardless of viewport width. The Save
                   * button is explicitly placed at column 3, row 2 (not relying
                   * on grid auto-flow, which would place it right after field 5
                   * on a 3rd row instead) — `self-end` bottom-aligns it within
                   * that row's cell, which (since the button is `size-12`/48px,
                   * exactly matching each `h-12` input) lands its top border
                   * flush with row 2's own input top border, not just "roughly
                   * near it." Three earlier placements (floating below in
                   * leftover grid whitespace, same-row-as-the-last-field only,
                   * then centered against all 3 rows rather than exactly
                   * top-aligned with row 2 specifically) each missed live
                   * feedback before landing here. `w-fit` on the grid keeps its
                   * columns sized to their (narrow, `w-16`) field content
                   * instead of splitting the card's full width evenly. */}
                  <div className="grid w-fit grid-cols-[auto_auto_auto_auto] gap-x-6 gap-y-3">
                    <div className="col-start-1 row-start-1 flex flex-col gap-1">
                      {/* #446 — a fixed min-h reserves the same vertical space
                       * whether or not this particular label actually wraps, so
                       * every input in the row still starts at the same y
                       * position as its row siblings (a longer Russian label
                       * wrapping to 2 lines here used to push just *that*
                       * column's input down, misaligning it from the others in
                       * the same row). min-h-8 (32px) fits 2 lines at this
                       * text-xs size, the tallest any of these 5 labels wrap to. */}
                      <span className="min-h-8 text-xs text-muted-foreground">
                        {t.dailyEntry.muscleMassLabel}
                      </span>
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
                    </div>
                    <div className="col-start-2 row-start-1 flex flex-col gap-1">
                      <span className="min-h-8 text-xs text-muted-foreground">
                        {t.dailyEntry.visceralFatLabel}
                      </span>
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
                    </div>
                    <div className="col-start-1 row-start-2 flex flex-col gap-1">
                      <span className="min-h-8 text-xs text-muted-foreground">
                        {t.dailyEntry.bodyWaterLabel}
                      </span>
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
                    </div>
                    <div className="col-start-2 row-start-2 flex flex-col gap-1">
                      <span className="min-h-8 text-xs text-muted-foreground">
                        {t.dailyEntry.boneMassLabel}
                      </span>
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
                    </div>
                    <div className="col-start-1 row-start-3 flex flex-col gap-1">
                      <span className="min-h-8 text-xs text-muted-foreground">
                        {t.dailyEntry.bodyFatLabel}
                      </span>
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
                    </div>
                    {/* #424 — added as a 4th grid column at Save's own row (not
                     * a new row/placement scheme), so Save's already-live-
                     * validated col-start-3/row-start-2 position (#427) is
                     * untouched by this addition. */}
                    {state.canCancelBodyCompositionEdit && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xl"
                        aria-label={t.dailyEntry.cancelEditBodyCompositionLabel}
                        onClick={state.cancelEditBodyComposition}
                        className="col-start-4 row-start-2 self-end"
                      >
                        <X aria-hidden="true" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-xl"
                      aria-label={t.dailyEntry.saveBodyCompositionLabel}
                      onClick={state.saveBodyComposition}
                      className="col-start-3 row-start-2 self-end"
                    >
                      <Check aria-hidden="true" />
                    </Button>
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
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
