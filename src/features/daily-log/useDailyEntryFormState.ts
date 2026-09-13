import { useMemo, useRef } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import type { DailyEntry, Emotion, NightEatingRemember } from '@/domain/dailyEntry'
import {
  hadNightEating,
  totalCalories,
  totalCarbs,
  totalFat,
  totalProtein,
} from '@/domain/dailyEntry'
import { useLocale, useTranslation, formatNumber } from '@/i18n'
import { usePreviousDayEntry, useEntryFieldComparisonBaselines } from '@/shared/hooks'
import {
  formatKcal,
  formatMacroGrams,
  macrosSummaryTextWithCalories,
} from '@/shared/lib/macroDisplay'
import {
  useAlcoholTrackingStore,
  useDigestionTrackingStore,
  useGoalStore,
  useProfileStore,
  useTrackedFieldsStore,
  useWaterTrackingStore,
} from '@/stores'
import { entryToFormValues, formValuesToEntry } from './dailyEntryFormMapping'
import { sanitizeDailyEntryFormValues } from './sanitizeDailyEntryFormValues'
import { useDailyEntryBodyComposition } from './useDailyEntryBodyComposition'
import { useDailyEntryNoteFields } from './useDailyEntryNoteFields'
import { useDailyEntrySleep } from './useDailyEntrySleep'
import { useDailyEntryStepsAndMeasurements } from './useDailyEntryStepsAndMeasurements'
import { useDailyEntryWaterAndTotals } from './useDailyEntryWaterAndTotals'
import { useDailyEntryWeight } from './useDailyEntryWeight'
import { type DailyEntryFormValues } from './dailyEntryFormSchema'

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

/**
 * #416 — field state/handlers for `DailyEntryFormTop`/`DailyEntryFormBottom`.
 * #868 — per-field groups live in dedicated hooks so this file stays ≤500.
 */
export function useDailyEntryFormState({
  date,
  existingEntry,
  onSave,
  alwaysEditable = false,
}: DailyEntryFormProps) {
  const t = useTranslation()
  const locale = useLocale()
  const previousDayEntry = usePreviousDayEntry(date)
  const entryComparisonBaselines = useEntryFieldComparisonBaselines(date)
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
  const savedNotesRef = useRef({
    note: initialValues.note,
    morningNote: initialValues.morningNote,
    nightEatingReason: initialValues.nightEatingReason,
    nightEatingNoWhatHelped: initialValues.nightEatingNoWhatHelped,
  })
  const digestionTrackingEnabled = useDigestionTrackingStore(
    (state) => state.enabled,
  )
  const alcoholTrackingEnabled = useAlcoholTrackingStore(
    (state) => state.enabled,
  )
  const waterTrackingEnabled = useWaterTrackingStore((state) => state.enabled)
  const trackedFields = useTrackedFieldsStore((state) => state.tracked)
  const sex = useProfileStore((state) => state.sex)
  const dailyCalorieTargetKcal = useGoalStore(
    (state) => state.goal?.dailyCalorieTargetKcal,
  )
  const dailyProteinTargetG = useGoalStore(
    (state) => state.goal?.dailyProteinTargetG,
  )
  const dailyFatTargetG = useGoalStore((state) => state.goal?.dailyFatTargetG)
  const dailyCarbTargetG = useGoalStore(
    (state) => state.goal?.dailyCarbTargetG,
  )

  const {
    register,
    getValues,
    setValue,
    reset,
    control,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<DailyEntryFormValues>({
    defaultValues: initialValues,
  })

  const weightKg = useWatch({ control, name: 'weightKg' })
  const note = useWatch({ control, name: 'note' })
  const morningNote = useWatch({ control, name: 'morningNote' })
  const sleepHours = useWatch({ control, name: 'sleepHours' })
  const deepSleepHours = useWatch({ control, name: 'deepSleepHours' })
  const steps = useWatch({ control, name: 'steps' })
  const waistCm = useWatch({ control, name: 'waistCm' })
  const hipCm = useWatch({ control, name: 'hipCm' })
  const bodyFatPercent = useWatch({ control, name: 'bodyFatPercent' })
  const muscleMassKg = useWatch({ control, name: 'muscleMassKg' })
  const visceralFatRating = useWatch({ control, name: 'visceralFatRating' })
  const bodyWaterPercent = useWatch({ control, name: 'bodyWaterPercent' })
  const boneMassKg = useWatch({ control, name: 'boneMassKg' })
  const hadConstipation = useWatch({ control, name: 'hadConstipation' })
  const hadAlcohol = useWatch({ control, name: 'hadAlcohol' })
  const nightEatingOverride = useWatch({
    control,
    name: 'nightEatingOverride',
  })
  const nightEatingRemember = useWatch({
    control,
    name: 'nightEatingRemember',
  })
  const nightEatingReason = useWatch({
    control,
    name: 'nightEatingReason',
  })
  const nightEatingNoEasy = useWatch({
    control,
    name: 'nightEatingNoEasy',
  })
  const nightEatingNoWhatHelped = useWatch({
    control,
    name: 'nightEatingNoWhatHelped',
  })
  const waterEntries = useWatch({ control, name: 'waterEntries' }) ?? []
  const dayTotals = useWatch({ control, name: 'dayTotals' })
  const dayEmotion = useWatch({ control, name: 'emotion' })
  const calorieEntries = useWatch({ control, name: 'calorieEntries' }) ?? []
  const nightEatingEffective = hadNightEating({
    calorieEntries,
    nightEatingOverride,
  })
  const dayTotalCalories = totalCalories(calorieEntries, dayTotals) ?? 0
  const consumedProteinG = totalProtein(calorieEntries, dayTotals)
  const consumedFatG = totalFat(calorieEntries, dayTotals)
  const consumedCarbG = totalCarbs(calorieEntries, dayTotals)
  const dayMacrosSummary = macrosSummaryTextWithCalories(
    totalCalories(calorieEntries, dayTotals),
    consumedProteinG,
    consumedFatG,
    consumedCarbG,
    locale,
    t,
  )
  const remainingKcal =
    dailyCalorieTargetKcal !== undefined
      ? dailyCalorieTargetKcal - dayTotalCalories
      : undefined
  const remainingProteinG =
    dailyProteinTargetG !== undefined
      ? dailyProteinTargetG - (consumedProteinG ?? 0)
      : undefined
  const remainingFatG =
    dailyFatTargetG !== undefined
      ? dailyFatTargetG - (consumedFatG ?? 0)
      : undefined
  const remainingCarbG =
    dailyCarbTargetG !== undefined
      ? dailyCarbTargetG - (consumedCarbG ?? 0)
      : undefined
  const dayRemainingMacrosSummary = macrosSummaryTextWithCalories(
    remainingKcal,
    remainingProteinG,
    remainingFatG,
    remainingCarbG,
    locale,
    t,
  )
  const dayMacrosDescription = t.dailyEntry.macrosSummary(
    formatMacroGrams(consumedProteinG, locale, t),
    formatMacroGrams(consumedFatG, locale, t),
    formatMacroGrams(consumedCarbG, locale, t),
  )
  const remainingMacrosLine = t.dailyEntry.macrosSummary(
    formatMacroGrams(remainingProteinG, locale, t),
    formatMacroGrams(remainingFatG, locale, t),
    formatMacroGrams(remainingCarbG, locale, t),
  )
  const dayRemainingMacrosDescription =
    dailyCalorieTargetKcal !== undefined
      ? [
          t.today.targetMinusConsumedText(
            formatKcal(dailyCalorieTargetKcal, locale, t),
            formatKcal(dayTotalCalories, locale, t),
          ),
          remainingMacrosLine,
        ].join('\n')
      : remainingMacrosLine
  const dayTotalsSavedSummary =
    dayTotals !== undefined
      ? [
          macrosSummaryTextWithCalories(
            dayTotals.amountKcal,
            dayTotals.proteinG,
            dayTotals.fatG,
            dayTotals.carbsG,
            locale,
            t,
          ),
          dayTotals.fiberG !== undefined
            ? `${t.dailyEntry.fiberLabel}: ${formatNumber(dayTotals.fiberG, locale, 0)} ${t.dailyEntry.gramsUnit}`
            : null,
        ]
          .filter(Boolean)
          .join(' · ')
      : null

  function persist(values: DailyEntryFormValues) {
    onSave(
      formValuesToEntry(
        sanitizeDailyEntryFormValues(
          values,
          initialValues,
          savedNotesRef.current,
        ),
        date,
        entryIdentity,
        existingEntry,
      ),
    )
  }

  function persistWithCleared(
    values: DailyEntryFormValues,
    cleared: Partial<DailyEntryFormValues>,
  ) {
    onSave(
      formValuesToEntry(
        {
          ...sanitizeDailyEntryFormValues(
            values,
            initialValues,
            savedNotesRef.current,
          ),
          ...cleared,
        },
        date,
        entryIdentity,
        existingEntry,
      ),
    )
  }

  const fieldApi = {
    alwaysEditable,
    initialValues,
    t,
    getValues,
    setValue,
    reset,
    setError,
    clearErrors,
    persist,
  }
  const weight = useDailyEntryWeight({
    ...fieldApi,
    previousDayEntry,
  })
  const sleep = useDailyEntrySleep(fieldApi)
  const notes = useDailyEntryNoteFields({
    ...fieldApi,
    persistWithCleared,
    savedNotesRef,
  })
  const waterAndTotals = useDailyEntryWaterAndTotals({
    ...fieldApi,
    dayTotals,
  })
  const stepsAndMeasurements = useDailyEntryStepsAndMeasurements(fieldApi)
  const bodyComposition = useDailyEntryBodyComposition({
    ...fieldApi,
    previousDayEntry,
  })

  function saveMood(emotion: Emotion | undefined) {
    setValue('emotion', emotion, { shouldDirty: true })
    persist(getValues())
  }

  function setHadConstipation(value: boolean) {
    setValue('hadConstipation', value, { shouldDirty: true })
    persist({ ...getValues(), hadConstipation: value })
  }

  function setHadAlcohol(value: boolean) {
    setValue('hadAlcohol', value, { shouldDirty: true })
    persist({ ...getValues(), hadAlcohol: value })
  }

  function setNightEatingOverride(value: boolean | undefined) {
    setValue('nightEatingOverride', value, { shouldDirty: true })
    persist({ ...getValues(), nightEatingOverride: value })
  }

  function setNightEatingRemember(value: NightEatingRemember | undefined) {
    setValue('nightEatingRemember', value, { shouldDirty: true })
    persist({ ...getValues(), nightEatingRemember: value })
  }

  function setNightEatingNoEasy(value: boolean | undefined) {
    setValue('nightEatingNoEasy', value, { shouldDirty: true })
    persist({ ...getValues(), nightEatingNoEasy: value })
  }

  return {
    t,
    locale,
    alwaysEditable,
    errors,
    register,
    entryComparisonBaselines,
    weightKg,
    ...weight,
    trackedFields,
    sleepHours,
    deepSleepHours,
    ...sleep,
    dayTotalCalories,
    dayMacrosSummary,
    dayMacrosDescription,
    dayRemainingMacrosSummary,
    dayRemainingMacrosDescription,
    remainingKcal,
    calorieEntries,
    setValue,
    getValues,
    persist,
    dailyCalorieTargetKcal,
    date,
    dayTotals,
    dayTotalsSavedSummary,
    ...waterAndTotals,
    steps,
    ...stepsAndMeasurements,
    waistCm,
    hipCm,
    muscleMassKg,
    visceralFatRating,
    bodyWaterPercent,
    boneMassKg,
    bodyFatPercent,
    ...bodyComposition,
    note,
    ...notes,
    morningNote,
    dayEmotion,
    saveMood,
    waterTrackingEnabled,
    waterEntries,
    digestionTrackingEnabled,
    hadConstipation,
    setHadConstipation,
    alcoholTrackingEnabled,
    hadAlcohol,
    setHadAlcohol,
    sex,
    nightEatingOverride,
    nightEatingEffective,
    setNightEatingOverride,
    nightEatingRemember,
    setNightEatingRemember,
    nightEatingReason,
    nightEatingNoEasy,
    setNightEatingNoEasy,
    nightEatingNoWhatHelped,
  }
}

export type DailyEntryFormState = ReturnType<typeof useDailyEntryFormState>
