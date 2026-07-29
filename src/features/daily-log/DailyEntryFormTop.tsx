import { Check, CupSoda, GlassWater, Pencil, Sun, X } from 'lucide-react'
import { formatExactNumber, formatNumber } from '@/i18n'
import { splitHoursMinutes } from '@/shared/lib/sleepDuration'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { parseNumberInput } from '@/shared/lib/parseNumberInput'
import { MealList } from './MealList'
import { isUnusualDailyCalories } from './unusualEntryThresholds'
import type { DailyEntryFormState } from './useDailyEntryFormState'

/**
 * #416 — the "Morning entries" group (Weight/Sleep/Body measurements/Body
 * composition), plus Meals and Water, which sit between the Morning and
 * Evening groups but aren't part of either (#404). Split out of the single
 * `DailyEntryForm.tsx` so `TodayScreen.tsx` can render this half, then
 * `CustomMetricLogSection`, then `DailyEntryFormBottom` (the Evening
 * group) — while both halves still share the same live form state via
 * `useDailyEntryFormState`. `DailyEntryForm.tsx` (the combined default,
 * used by History's `EntryRow.tsx`) renders this immediately followed by
 * `DailyEntryFormBottom`, unchanged from before this split.
 */
export function DailyEntryFormTop({ state }: { state: DailyEntryFormState }) {
  const { t, locale } = state

  return (
    <>
      <div className="flex flex-col gap-4 rounded-lg border border-border p-3">
        <div className="flex flex-col gap-0.5">
          <span className="flex items-center gap-1.5 text-sm font-medium">
            <Sun aria-hidden="true" className="size-4" />
            {t.dailyEntry.morningEntriesTitle}
          </span>
          <span className="text-xs text-muted-foreground">
            {t.dailyEntry.morningEntriesSubtitle}
          </span>
        </div>

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
                    const deepParts = splitHoursMinutes(state.deepSleepHours)
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
                      aria-invalid={state.errors.sleepHours ? true : undefined}
                      className="h-12 w-12"
                      value={state.sleepHoursPart}
                      onChange={(e) => state.setSleepHoursPart(e.target.value)}
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
                      aria-invalid={state.errors.sleepHours ? true : undefined}
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
                  {state.errors.waistCm?.message ?? state.errors.hipCm?.message}
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
              <div className="flex h-12 items-center justify-between rounded-lg bg-muted px-3">
                <span className="text-sm text-foreground">
                  {t.dailyEntry.bodyCompositionSummary(
                    state.muscleMassKg === undefined
                      ? '—'
                      : `${formatExactNumber(state.muscleMassKg, locale)}${t.dailyEntry.kgUnit}`,
                    state.visceralFatRating === undefined
                      ? '—'
                      : formatExactNumber(state.visceralFatRating, locale),
                    state.bodyWaterPercent === undefined
                      ? '—'
                      : `${formatExactNumber(state.bodyWaterPercent, locale)}${t.dailyEntry.percentUnit}`,
                    state.boneMassKg === undefined
                      ? '—'
                      : `${formatExactNumber(state.boneMassKg, locale)}${t.dailyEntry.kgUnit}`,
                    state.bodyFatPercent === undefined
                      ? '—'
                      : `${formatExactNumber(state.bodyFatPercent, locale)}${t.dailyEntry.percentUnit}`,
                  )}
                </span>
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
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">
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
                      {...state.register('muscleMassKg', {
                        setValueAs: parseNumberInput,
                      })}
                    />
                    <span className="text-xs text-muted-foreground">
                      {t.dailyEntry.kgUnit}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">
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
                      {...state.register('visceralFatRating', {
                        setValueAs: parseNumberInput,
                      })}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">
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
                      {...state.register('bodyWaterPercent', {
                        setValueAs: parseNumberInput,
                      })}
                    />
                    <span className="text-xs text-muted-foreground">
                      {t.dailyEntry.percentUnit}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">
                    {t.dailyEntry.boneMassLabel}
                  </span>
                  <div className="flex items-center gap-1">
                    <Input
                      type="text"
                      inputMode="decimal"
                      aria-label={`${t.dailyEntry.boneMassLabel} (${t.dailyEntry.kgUnit})`}
                      aria-invalid={state.errors.boneMassKg ? true : undefined}
                      className="h-12 w-16"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          state.saveBodyComposition()
                        }
                      }}
                      {...state.register('boneMassKg', {
                        setValueAs: parseNumberInput,
                      })}
                    />
                    <span className="text-xs text-muted-foreground">
                      {t.dailyEntry.kgUnit}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">
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
                      {...state.register('bodyFatPercent', {
                        setValueAs: parseNumberInput,
                      })}
                    />
                    <span className="text-xs text-muted-foreground">
                      {t.dailyEntry.percentUnit}
                    </span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-xl"
                  aria-label={t.dailyEntry.saveBodyCompositionLabel}
                  onClick={state.saveBodyComposition}
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
        <div className="flex flex-col gap-1.5">
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
