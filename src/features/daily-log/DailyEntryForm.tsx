import { useMemo, useState } from 'react'
import { Check, Pencil } from 'lucide-react'
import { useForm } from 'react-hook-form'
import type { DailyEntry, Emotion } from '@/domain/dailyEntry'
import {
  totalCalories,
  totalCarbs,
  totalFat,
  totalProtein,
} from '@/domain/dailyEntry'
import {
  formatExactNumber,
  formatNumber,
  useLocale,
  useTranslation,
} from '@/i18n'
import { DAY_EMOTIONS } from '@/shared/lib/emotionIcons'
import { macrosSummaryText } from '@/shared/lib/macroDisplay'
import { parseNumberInput } from '@/shared/lib/parseNumberInput'
import { Button } from '@/shared/ui/button'
import { InfoTooltip } from '@/shared/ui/info-tooltip'
import { Input } from '@/shared/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/toggle-group'
import { useDigestionTrackingStore } from '@/stores'
import { entryToFormValues, formValuesToEntry } from './dailyEntryFormMapping'
import { EmotionPicker } from './EmotionPicker'
import { MealList } from './MealList'
import {
  bodyFatPercentSchema,
  deepSleepHoursSchema,
  hipCmSchema,
  noteSchema,
  sleepHoursSchema,
  stepsSchema,
  waistCmSchema,
  weightSchema,
  type DailyEntryFormValues,
} from './dailyEntryFormSchema'
import {
  isUnusualDailyCalories,
  isUnusualWeightKg,
} from './unusualEntryThresholds'

export interface DailyEntryFormProps {
  date: string
  existingEntry: DailyEntry | null
  /** Called every time an individual field or meal is saved — there is no
   * single whole-form submit anymore (#31). May fire many times per
   * session: once per weight save, note save, meal add/edit/delete. */
  onSave: (entry: DailyEntry) => void
  /**
   * Skips the read-only-display-until-pencil-clicked treatment for Weight
   * and Note, rendering them as plain always-editable inputs instead. Used
   * by History's inline edit, where clicking "Edit entry" already is the
   * explicit edit gesture — a second layer of per-field pencils there would
   * just be redundant. Itemized calorie editing is unaffected either way.
   */
  alwaysEditable?: boolean
}

/** Sleep is stored as decimal hours (`sleepHours`/`deepSleepHours`), but
 * entered as separate hours+minutes fields (#69) — typing "7.5" on a mobile
 * numeric keypad was awkward, whole hours + whole minutes is the natural
 * way people think about sleep duration. These two functions are the only
 * place that conversion happens. */
function splitHoursMinutes(value: number | undefined): {
  hours: string
  minutes: string
} {
  if (value === undefined) return { hours: '', minutes: '' }
  const hours = Math.floor(value)
  const minutes = Math.round((value - hours) * 60)
  return { hours: String(hours), minutes: String(minutes) }
}

function combineHoursMinutes(
  hoursText: string,
  minutesText: string,
): number | undefined {
  const hours = parseNumberInput(hoursText)
  const minutes = parseNumberInput(minutesText)
  if (hours === undefined && minutes === undefined) return undefined
  return (hours ?? 0) + (minutes ?? 0) / 60
}

export function DailyEntryForm({
  date,
  existingEntry,
  onSave,
  alwaysEditable = false,
}: DailyEntryFormProps) {
  const t = useTranslation()
  const locale = useLocale()
  // A stable identity for this day's entry, reused across every independent
  // save in this session (weight, note, each meal) so they all update the
  // same record instead of each save inventing a new id. Computed once —
  // existingEntry won't reactively reflect earlier saves made in this same
  // session, since the parent doesn't necessarily re-pass a fresh prop
  // after every one of potentially many saves.
  const entryIdentity = useMemo(
    () => ({
      id: existingEntry?.id ?? crypto.randomUUID(),
      createdAt: existingEntry?.createdAt ?? new Date().toISOString(),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
  const initialValues = useMemo(
    () => entryToFormValues(existingEntry),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
  // Whether Weight/Note render as an editable input rather than read-only
  // display + pencil. Deliberately NOT derived from the live watched value —
  // that would flip to display mode mid-keystroke on every first character
  // typed into a blank field. Starts editable only when there's nothing
  // saved yet; a pencil click re-opens it explicitly, a successful save
  // collapses it back.
  const [isEditingWeight, setIsEditingWeight] = useState(
    alwaysEditable || initialValues.weightKg === undefined,
  )
  // #218: the exact value a Save tap flagged as unusual (not the same as
  // "is the current field value unusual" — a second tap should only skip
  // straight to saving if the value hasn't changed since the warning
  // appeared; editing it after seeing the warning re-checks it fresh
  // rather than silently reusing a stale confirmation).
  const [pendingUnusualWeight, setPendingUnusualWeight] = useState<
    number | null
  >(null)
  const [isEditingNote, setIsEditingNote] = useState(
    alwaysEditable || !initialValues.note,
  )
  const [isEditingSleep, setIsEditingSleep] = useState(
    alwaysEditable ||
      (initialValues.sleepHours === undefined &&
        initialValues.deepSleepHours === undefined),
  )
  // Hours+minutes sub-fields for sleep entry (#69) — kept as local text
  // state rather than react-hook-form fields, since the form's own
  // sleepHours/deepSleepHours stay decimal; these are combined into that
  // decimal only on save (see combineHoursMinutes).
  const initialSleepParts = splitHoursMinutes(initialValues.sleepHours)
  const initialDeepSleepParts = splitHoursMinutes(initialValues.deepSleepHours)
  const [sleepHoursPart, setSleepHoursPart] = useState(initialSleepParts.hours)
  const [sleepMinutesPart, setSleepMinutesPart] = useState(
    initialSleepParts.minutes,
  )
  const [deepSleepHoursPart, setDeepSleepHoursPart] = useState(
    initialDeepSleepParts.hours,
  )
  const [deepSleepMinutesPart, setDeepSleepMinutesPart] = useState(
    initialDeepSleepParts.minutes,
  )
  const [isEditingSteps, setIsEditingSteps] = useState(
    alwaysEditable || initialValues.steps === undefined,
  )
  // Body measurements (#225) — waist/hip/body fat bundled under one edit
  // toggle, same "combine related optional numbers into one section"
  // pattern Sleep already uses for hours+deep hours above.
  const [isEditingBodyMeasurements, setIsEditingBodyMeasurements] = useState(
    alwaysEditable ||
      (initialValues.waistCm === undefined &&
        initialValues.hipCm === undefined &&
        initialValues.bodyFatPercent === undefined),
  )

  // Opt-in digestion tracking's on/off toggle (Settings) — the toggle
  // itself only renders on this screen when enabled, same gate DayDetail
  // already uses for its own copy of this control.
  const digestionTrackingEnabled = useDigestionTrackingStore(
    (state) => state.enabled,
  )

  const {
    register,
    getValues,
    setValue,
    watch,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<DailyEntryFormValues>({
    defaultValues: initialValues,
  })

  const weightKg = watch('weightKg')
  const note = watch('note')
  const sleepHours = watch('sleepHours')
  const deepSleepHours = watch('deepSleepHours')
  const steps = watch('steps')
  const waistCm = watch('waistCm')
  const hipCm = watch('hipCm')
  const bodyFatPercent = watch('bodyFatPercent')
  const hadConstipation = watch('hadConstipation')
  const dayEmotion = watch('emotion')
  const calorieEntries = watch('calorieEntries') ?? []
  const DayEmotionIcon = DAY_EMOTIONS.find((e) => e.value === dayEmotion)?.Icon
  const dayTotalCalories = totalCalories(calorieEntries) ?? 0
  const dayMacrosSummary = macrosSummaryText(
    totalProtein(calorieEntries),
    totalFat(calorieEntries),
    totalCarbs(calorieEntries),
    locale,
    t,
  )

  const showWeightAsDisplay = !alwaysEditable && !isEditingWeight
  const showNoteAsDisplay = !alwaysEditable && !isEditingNote
  const showSleepAsDisplay = !alwaysEditable && !isEditingSleep
  const showStepsAsDisplay = !alwaysEditable && !isEditingSteps
  const showBodyMeasurementsAsDisplay =
    !alwaysEditable && !isEditingBodyMeasurements

  function setDayEmotion(emotion: Emotion | undefined) {
    setValue('emotion', emotion, { shouldDirty: true })
  }

  function persist(values: DailyEntryFormValues) {
    onSave(formValuesToEntry(values, date, entryIdentity))
  }

  // Saves immediately on tap, same as every other independent field here
  // (#31) — no separate confirm step, since a toggle whose own state
  // already shows what's about to happen doesn't need one.
  function setHadConstipation(value: boolean) {
    setValue('hadConstipation', value, { shouldDirty: true })
    persist({ ...getValues(), hadConstipation: value })
  }

  function saveWeight() {
    const result = weightSchema.safeParse(getValues('weightKg'))
    if (!result.success) {
      setError('weightKg', { message: result.error.issues[0].message })
      setPendingUnusualWeight(null)
      return
    }
    clearErrors('weightKg')
    if (
      result.data !== undefined &&
      isUnusualWeightKg(result.data) &&
      pendingUnusualWeight !== result.data
    ) {
      setPendingUnusualWeight(result.data)
      return
    }
    setPendingUnusualWeight(null)
    setIsEditingWeight(false)
    persist(getValues())
  }

  function discardUnusualWeightWarning() {
    setPendingUnusualWeight(null)
  }

  function saveNote() {
    const result = noteSchema.safeParse(getValues('note'))
    if (!result.success) {
      setError('note', { message: result.error.issues[0].message })
      return
    }
    clearErrors('note')
    setIsEditingNote(false)
    persist(getValues())
  }

  function saveSleep() {
    const sleepHoursValue = combineHoursMinutes(
      sleepHoursPart,
      sleepMinutesPart,
    )
    const deepSleepHoursValue = combineHoursMinutes(
      deepSleepHoursPart,
      deepSleepMinutesPart,
    )
    const hoursResult = sleepHoursSchema.safeParse(sleepHoursValue)
    const deepHoursResult = deepSleepHoursSchema.safeParse(deepSleepHoursValue)
    if (!hoursResult.success) {
      setError('sleepHours', { message: hoursResult.error.issues[0].message })
      return
    }
    if (!deepHoursResult.success) {
      setError('deepSleepHours', {
        message: deepHoursResult.error.issues[0].message,
      })
      return
    }
    clearErrors('sleepHours')
    clearErrors('deepSleepHours')
    setValue('sleepHours', sleepHoursValue, { shouldDirty: true })
    setValue('deepSleepHours', deepSleepHoursValue, { shouldDirty: true })
    setIsEditingSleep(false)
    persist({
      ...getValues(),
      sleepHours: sleepHoursValue,
      deepSleepHours: deepSleepHoursValue,
    })
  }

  function saveSteps() {
    const result = stepsSchema.safeParse(getValues('steps'))
    if (!result.success) {
      setError('steps', { message: result.error.issues[0].message })
      return
    }
    clearErrors('steps')
    setIsEditingSteps(false)
    persist(getValues())
  }

  function saveBodyMeasurements() {
    const waistResult = waistCmSchema.safeParse(getValues('waistCm'))
    const hipResult = hipCmSchema.safeParse(getValues('hipCm'))
    const bodyFatResult = bodyFatPercentSchema.safeParse(
      getValues('bodyFatPercent'),
    )
    if (!waistResult.success) {
      setError('waistCm', { message: waistResult.error.issues[0].message })
      return
    }
    if (!hipResult.success) {
      setError('hipCm', { message: hipResult.error.issues[0].message })
      return
    }
    if (!bodyFatResult.success) {
      setError('bodyFatPercent', {
        message: bodyFatResult.error.issues[0].message,
      })
      return
    }
    clearErrors('waistCm')
    clearErrors('hipCm')
    clearErrors('bodyFatPercent')
    setIsEditingBodyMeasurements(false)
    persist(getValues())
  }


  return (
    <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-4">
      {showWeightAsDisplay ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">
            {t.dailyEntry.weightLabel}
          </span>
          <div className="flex h-12 items-center justify-between rounded-lg bg-muted px-3">
            <span className="text-sm text-foreground">
              {formatExactNumber(weightKg!, locale)} {t.common.kg}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-xl"
              aria-label={t.dailyEntry.editWeightLabel}
              onClick={() => setIsEditingWeight(true)}
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
              aria-invalid={errors.weightKg ? true : undefined}
              className="h-12 flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  saveWeight()
                }
              }}
              {...register('weightKg', { setValueAs: parseNumberInput })}
            />
            <Button
              type="button"
              variant="outline"
              size="icon-xl"
              aria-label={t.dailyEntry.saveWeightLabel}
              onClick={saveWeight}
            >
              <Check aria-hidden="true" />
            </Button>
          </div>
          {errors.weightKg && (
            <p className="text-sm text-destructive">
              {errors.weightKg.message}
            </p>
          )}
          {/* #218: soft warning, not a hard block — weightSchema's own
           * 20-400kg range already rejects an outright-impossible value
           * before this ever renders; this catches a value still inside
           * that range but unusual enough to likely be a typo (e.g. an
           * extra digit). A second Save tap (same value) commits it
           * anyway; Fix it just dismisses the warning to keep editing. */}
          {pendingUnusualWeight !== null && (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-destructive">
                {t.dailyEntry.unusualWeightWarning}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={saveWeight}
                >
                  {t.dailyEntry.saveUnusualWeightAnywayLabel}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={discardUnusualWeightWarning}
                >
                  {t.dailyEntry.fixWeightLabel}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {showSleepAsDisplay ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">{t.dailyEntry.sleepLabel}</span>
          <div className="flex h-12 items-center justify-between rounded-lg bg-muted px-3">
            <span className="text-sm text-foreground">
              {t.dailyEntry.sleepSummary(
                sleepHours === undefined
                  ? '—'
                  : `${splitHoursMinutes(sleepHours).hours}${t.dailyEntry.hoursUnit} ${splitHoursMinutes(sleepHours).minutes}${t.dailyEntry.minutesUnit}`,
                deepSleepHours === undefined
                  ? '—'
                  : `${splitHoursMinutes(deepSleepHours).hours}${t.dailyEntry.hoursUnit} ${splitHoursMinutes(deepSleepHours).minutes}${t.dailyEntry.minutesUnit}`,
              )}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-xl"
              aria-label={t.dailyEntry.editSleepLabel}
              onClick={() => {
                const parts = splitHoursMinutes(sleepHours)
                const deepParts = splitHoursMinutes(deepSleepHours)
                setSleepHoursPart(parts.hours)
                setSleepMinutesPart(parts.minutes)
                setDeepSleepHoursPart(deepParts.hours)
                setDeepSleepMinutesPart(deepParts.minutes)
                setIsEditingSleep(true)
              }}
            >
              <Pencil aria-hidden="true" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">{t.dailyEntry.sleepLabel}</span>
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
                  aria-invalid={errors.sleepHours ? true : undefined}
                  className="h-12 w-12"
                  value={sleepHoursPart}
                  onChange={(e) => setSleepHoursPart(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      saveSleep()
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
                  aria-invalid={errors.sleepHours ? true : undefined}
                  className="h-12 w-12"
                  value={sleepMinutesPart}
                  onChange={(e) => setSleepMinutesPart(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      saveSleep()
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
                  aria-invalid={errors.deepSleepHours ? true : undefined}
                  className="h-12 w-12"
                  value={deepSleepHoursPart}
                  onChange={(e) => setDeepSleepHoursPart(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      saveSleep()
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
                  aria-invalid={errors.deepSleepHours ? true : undefined}
                  className="h-12 w-12"
                  value={deepSleepMinutesPart}
                  onChange={(e) => setDeepSleepMinutesPart(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      saveSleep()
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
              onClick={saveSleep}
            >
              <Check aria-hidden="true" />
            </Button>
          </div>
          {(errors.sleepHours || errors.deepSleepHours) && (
            <p className="text-sm text-destructive">
              {errors.sleepHours?.message ?? errors.deepSleepHours?.message}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium">
            {t.dailyEntry.caloriesLabel}
          </span>
          <InfoTooltip
            text={t.dailyEntry.caloriesTooltip}
            label={t.dailyEntry.caloriesTooltipLabel}
          />
        </div>
        <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
          <span className="flex items-baseline gap-1.5" aria-live="polite">
            <span className="text-3xl font-semibold tabular-nums text-foreground">
              {formatNumber(dayTotalCalories, locale, 0)}
            </span>
            <span className="text-sm text-muted-foreground">
              {t.dailyEntry.caloriesTodaySuffix}
            </span>
          </span>
        </div>
        {/* #218: a quiet inline note, not a blocking confirm — a day's
         * total crossing this threshold can't map to a single "save"
         * action to intercept the way the weight warning does, since it's
         * a running sum across however many meals get added throughout
         * the day. Disappears again on its own once an item is edited or
         * removed and the total drops back under the threshold. */}
        {isUnusualDailyCalories(dayTotalCalories) && (
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
        {dayMacrosSummary && (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">
              {t.dailyEntry.macrosLabel}
            </span>
            <div className="flex h-12 items-center rounded-lg bg-muted px-3">
              <span className="text-sm text-foreground" aria-live="polite">
                {dayMacrosSummary}
              </span>
            </div>
          </div>
        )}

        {/* Meal editing extracted to its own component (#145) — reused
         * as-is by DayDetail.tsx too, so History's read-only expand-row can
         * edit/add/delete meals without needing this whole form. */}
        <MealList
          calorieEntries={calorieEntries}
          date={date}
          onChange={(next) => {
            setValue('calorieEntries', next, { shouldDirty: true })
            persist({ ...getValues(), calorieEntries: next })
          }}
        />
      </div>

      {/* Moved here, next to the Day note, rather than up with the other
       * morning fields (#101) — unlike Weight/Sleep, step count usually
       * isn't known until later in the day, so its old position up top
       * implied it should be filled in at the same time as those. */}
      {showStepsAsDisplay ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">{t.dailyEntry.stepsLabel}</span>
          <div className="flex h-12 items-center justify-between rounded-lg bg-muted px-3">
            <span className="text-sm text-foreground">
              {steps === undefined ? '—' : formatNumber(steps, locale, 0)}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-xl"
              aria-label={t.dailyEntry.editStepsLabel}
              onClick={() => setIsEditingSteps(true)}
            >
              <Pencil aria-hidden="true" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">{t.dailyEntry.stepsLabel}</span>
          <div className="flex items-center gap-3">
            <Input
              type="text"
              inputMode="numeric"
              aria-label={t.dailyEntry.stepsLabel}
              aria-invalid={errors.steps ? true : undefined}
              className="h-12 w-24"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  saveSteps()
                }
              }}
              {...register('steps', { setValueAs: parseNumberInput })}
            />
            <Button
              type="button"
              variant="outline"
              size="icon-xl"
              aria-label={t.dailyEntry.saveStepsLabel}
              onClick={saveSteps}
            >
              <Check aria-hidden="true" />
            </Button>
          </div>
          {errors.steps && (
            <p className="text-sm text-destructive">{errors.steps.message}</p>
          )}
        </div>
      )}

      {/* #225: waist/hip/body fat bundled under one edit toggle, same
       * shape as the Sleep block above (one label, one Save button, several
       * sub-inputs) rather than three separate top-level fields — these are
       * all "the same kind of thing" (an occasional body measurement), so
       * a user updating one is likely updating the others at the same time. */}
      {showBodyMeasurementsAsDisplay ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">
            {t.dailyEntry.bodyMeasurementsLabel}
          </span>
          <div className="flex h-12 items-center justify-between rounded-lg bg-muted px-3">
            <span className="text-sm text-foreground">
              {t.dailyEntry.bodyMeasurementsSummary(
                waistCm === undefined
                  ? '—'
                  : `${formatExactNumber(waistCm, locale)}${t.dailyEntry.cmUnit}`,
                hipCm === undefined
                  ? '—'
                  : `${formatExactNumber(hipCm, locale)}${t.dailyEntry.cmUnit}`,
                bodyFatPercent === undefined
                  ? '—'
                  : `${formatExactNumber(bodyFatPercent, locale)}${t.dailyEntry.percentUnit}`,
              )}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-xl"
              aria-label={t.dailyEntry.editBodyMeasurementsLabel}
              onClick={() => setIsEditingBodyMeasurements(true)}
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
                  aria-invalid={errors.waistCm ? true : undefined}
                  className="h-12 w-16"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      saveBodyMeasurements()
                    }
                  }}
                  {...register('waistCm', { setValueAs: parseNumberInput })}
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
                  aria-invalid={errors.hipCm ? true : undefined}
                  className="h-12 w-16"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      saveBodyMeasurements()
                    }
                  }}
                  {...register('hipCm', { setValueAs: parseNumberInput })}
                />
                <span className="text-xs text-muted-foreground">
                  {t.dailyEntry.cmUnit}
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
                  aria-invalid={errors.bodyFatPercent ? true : undefined}
                  className="h-12 w-16"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      saveBodyMeasurements()
                    }
                  }}
                  {...register('bodyFatPercent', {
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
              aria-label={t.dailyEntry.saveBodyMeasurementsLabel}
              onClick={saveBodyMeasurements}
            >
              <Check aria-hidden="true" />
            </Button>
          </div>
          {(errors.waistCm || errors.hipCm || errors.bodyFatPercent) && (
            <p className="text-sm text-destructive">
              {errors.waistCm?.message ??
                errors.hipCm?.message ??
                errors.bodyFatPercent?.message}
            </p>
          )}
        </div>
      )}

      {showNoteAsDisplay ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">{t.dailyEntry.noteLabel}</span>
          {/* #189: min-h-12, not a fixed h-12 — a long note wraps to
           * multiple lines, and the fixed-height version didn't grow to
           * fit, so the mood icon/edit button (vertically centered against
           * the old, too-short box) ended up overlapping the wrapped text
           * instead of sitting clear of it. With only a floor height, a
           * short single-line note still renders at the same 48px (the
           * icon-xl button's own 44px + this row's centering keeps it
           * there), while a long one grows the row to fit and items-center
           * still centers the button/icon against the full wrapped height. */}
          <div className="flex min-h-12 items-center justify-between gap-2 rounded-lg bg-muted px-3 py-1.5">
            <span className="flex items-center gap-1.5 text-sm text-foreground">
              {note}
              {DayEmotionIcon && (
                <>
                  {/* #210 bumped size-3.5 (14px) to size-5 (20px); #243
                   * reported it still reads too small, bumped to size-6
                   * (24px). */}
                  <DayEmotionIcon
                    aria-hidden="true"
                    className="size-6 text-muted-foreground"
                  />
                  <span className="sr-only">
                    {t.dailyEntry.emotionLabel(dayEmotion!)}
                  </span>
                </>
              )}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-xl"
              aria-label={t.dailyEntry.editNoteLabel}
              onClick={() => setIsEditingNote(true)}
            >
              <Pencil aria-hidden="true" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">{t.dailyEntry.noteLabel}</span>
          <div className="flex items-center gap-3">
            <Input
              type="text"
              aria-label={t.dailyEntry.noteLabel}
              aria-invalid={errors.note ? true : undefined}
              placeholder={t.dailyEntry.noteFieldPlaceholder}
              className="h-12 flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  saveNote()
                }
              }}
              {...register('note')}
            />
            <Button
              type="button"
              variant="outline"
              size="icon-xl"
              aria-label={t.dailyEntry.saveNoteLabel}
              onClick={saveNote}
            >
              <Check aria-hidden="true" />
            </Button>
          </div>
          {errors.note && (
            <p className="text-sm text-destructive">{errors.note.message}</p>
          )}
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {t.dailyEntry.dayMoodLabel}
            </span>
            <EmotionPicker
              value={dayEmotion}
              onChange={setDayEmotion}
              options={DAY_EMOTIONS}
              labelFor={t.dailyEntry.emotionLabel}
              contextLabel={t.dailyEntry.dayMoodLabel}
            />
          </div>
        </div>
      )}

      {/* Surfaced directly on Today (previously only reachable via History's
       * DayDetail, which users found hard to discover) — both options are
       * always shown rather than a single unlabeled toggle, so the current
       * state reads unambiguously without relying on a highlight color
       * alone. Placed outside the note/mood block above so it stays visible
       * regardless of that block's own display/edit state. */}
      {digestionTrackingEnabled && (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">
            {t.dailyEntry.hadConstipationLabel}
          </span>
          <ToggleGroup
            type="single"
            aria-label={t.dailyEntry.hadConstipationLabel}
            value={hadConstipation ? 'yes' : 'no'}
            onValueChange={(value) =>
              value && setHadConstipation(value === 'yes')
            }
            className="w-fit"
          >
            <ToggleGroupItem value="no" className="h-12 px-6 text-base">
              {t.dailyEntry.hadConstipationNoOption}
            </ToggleGroupItem>
            <ToggleGroupItem value="yes" className="h-12 px-6 text-base">
              {t.dailyEntry.hadConstipationYesOption}
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      )}
    </form>
  )
}
