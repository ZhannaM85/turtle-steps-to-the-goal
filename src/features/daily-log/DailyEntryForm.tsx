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
  deepSleepHoursSchema,
  noteSchema,
  sleepHoursSchema,
  stepsSchema,
  weightSchema,
  type DailyEntryFormValues,
} from './dailyEntryFormSchema'

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
  const hadConstipation = watch('hadConstipation')
  const dayEmotion = watch('emotion')
  const calorieEntries = watch('calorieEntries') ?? []
  const DayEmotionIcon = DAY_EMOTIONS.find((e) => e.value === dayEmotion)?.Icon
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
      return
    }
    clearErrors('weightKg')
    setIsEditingWeight(false)
    persist(getValues())
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
              {formatNumber(totalCalories(calorieEntries) ?? 0, locale, 0)}
            </span>
            <span className="text-sm text-muted-foreground">
              {t.dailyEntry.caloriesTodaySuffix}
            </span>
          </span>
        </div>

        {/* Own field (#152) — was a text-xs caption line tucked under the
         * Calories card; promoted to the same labeled-field treatment as
         * Calories itself, just without the large number since it's three
         * values, not one. */}
        {dayMacrosSummary && (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">
              {t.dailyEntry.macrosLabel}
            </span>
            {/* self-start (#156 follow-up): a flex-col child stretches to
             * the parent's full width by default, so this box was showing
             * a visibly empty stretch of bg-muted background past the
             * short macros text — unlike Calories, this field never has a
             * reason to be as wide as the card. Sized to its own content
             * instead. */}
            <div className="self-start rounded-lg bg-muted px-3 py-2">
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

      {showNoteAsDisplay ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">{t.dailyEntry.noteLabel}</span>
          <div className="flex h-12 items-center justify-between rounded-lg bg-muted px-3">
            <span className="flex items-center gap-1.5 text-sm text-foreground">
              {note}
              {DayEmotionIcon && (
                <>
                  <DayEmotionIcon
                    aria-hidden="true"
                    className="size-3.5 text-muted-foreground"
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
