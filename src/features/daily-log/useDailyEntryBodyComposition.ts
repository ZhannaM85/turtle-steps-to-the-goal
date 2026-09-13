import { useState } from 'react'
import type {
  UseFormClearErrors,
  UseFormGetValues,
  UseFormReset,
  UseFormSetError,
  UseFormSetValue,
} from 'react-hook-form'
import type { DailyEntry } from '@/domain/dailyEntry'
import type { Dictionary } from '@/i18n'
import { isBlankSaveValue } from '@/shared/lib/isBlankSaveValue'
import { parseNumberInput } from '@/shared/lib/parseNumberInput'
import {
  bodyFatPercentSchema,
  bodyWaterPercentSchema,
  boneMassKgSchema,
  muscleMassKgSchema,
  visceralFatRatingSchema,
  type DailyEntryFormValues,
} from './dailyEntryFormSchema'
import {
  isUnusualBodyFatPercent,
  isUnusualBodyFatPercentDelta,
  isUnusualBodyWaterPercent,
  isUnusualBodyWaterPercentDelta,
  isUnusualBoneMassDeltaKg,
  isUnusualBoneMassKg,
  isUnusualMuscleMassDeltaKg,
  isUnusualMuscleMassKg,
  isUnusualVisceralFat,
  isUnusualVisceralFatDelta,
} from './unusualEntryThresholds'

export function useDailyEntryBodyComposition({
  alwaysEditable,
  initialValues,
  previousDayEntry,
  t,
  getValues,
  setValue,
  reset,
  setError,
  clearErrors,
  persist,
}: {
  alwaysEditable: boolean
  initialValues: DailyEntryFormValues
  previousDayEntry: DailyEntry | null
  t: Dictionary
  getValues: UseFormGetValues<DailyEntryFormValues>
  setValue: UseFormSetValue<DailyEntryFormValues>
  reset: UseFormReset<DailyEntryFormValues>
  setError: UseFormSetError<DailyEntryFormValues>
  clearErrors: UseFormClearErrors<DailyEntryFormValues>
  persist: (values: DailyEntryFormValues) => void
}) {
  const [hasSavedBodyComposition, setHasSavedBodyComposition] = useState(
    initialValues.muscleMassKg !== undefined ||
      initialValues.visceralFatRating !== undefined ||
      initialValues.bodyWaterPercent !== undefined ||
      initialValues.boneMassKg !== undefined ||
      initialValues.bodyFatPercent !== undefined,
  )
  const [isConfirmingDeleteBodyComposition, setIsConfirmingDeleteBodyComposition] =
    useState(false)
  const [pendingUnusualBodyComposition, setPendingUnusualBodyComposition] =
    useState<{
      muscleMassKg?: number
      visceralFatRating?: number
      bodyWaterPercent?: number
      boneMassKg?: number
      bodyFatPercent?: number
    } | null>(null)
  const [isEditingBodyComposition, setIsEditingBodyComposition] = useState(
    alwaysEditable ||
      (initialValues.muscleMassKg === undefined &&
        initialValues.visceralFatRating === undefined &&
        initialValues.bodyWaterPercent === undefined &&
        initialValues.boneMassKg === undefined &&
        initialValues.bodyFatPercent === undefined),
  )
  const showBodyCompositionAsDisplay =
    !alwaysEditable && !isEditingBodyComposition
  const canCancelBodyCompositionEdit =
    alwaysEditable || hasSavedBodyComposition
  const canDeleteBodyComposition = hasSavedBodyComposition

  function saveBodyComposition() {
    const muscleResult = muscleMassKgSchema.safeParse(
      parseNumberInput(getValues('muscleMassKg')),
    )
    const visceralResult = visceralFatRatingSchema.safeParse(
      parseNumberInput(getValues('visceralFatRating')),
    )
    const waterResult = bodyWaterPercentSchema.safeParse(
      parseNumberInput(getValues('bodyWaterPercent')),
    )
    const boneResult = boneMassKgSchema.safeParse(
      parseNumberInput(getValues('boneMassKg')),
    )
    const bodyFatResult = bodyFatPercentSchema.safeParse(
      parseNumberInput(getValues('bodyFatPercent')),
    )
    if (!muscleResult.success) {
      setError('muscleMassKg', {
        message: t.dailyEntry.invalidValueMessage,
      })
      return
    }
    if (!visceralResult.success) {
      setError('visceralFatRating', {
        message: t.dailyEntry.invalidValueMessage,
      })
      return
    }
    if (!waterResult.success) {
      setError('bodyWaterPercent', {
        message: t.dailyEntry.invalidValueMessage,
      })
      return
    }
    if (!boneResult.success) {
      setError('boneMassKg', { message: t.dailyEntry.invalidValueMessage })
      return
    }
    if (!bodyFatResult.success) {
      setError('bodyFatPercent', {
        message: t.dailyEntry.invalidValueMessage,
      })
      return
    }
    if (
      isBlankSaveValue(muscleResult.data) &&
      isBlankSaveValue(visceralResult.data) &&
      isBlankSaveValue(waterResult.data) &&
      isBlankSaveValue(boneResult.data) &&
      isBlankSaveValue(bodyFatResult.data)
    ) {
      const message = t.dailyEntry.invalidValueMessage
      setError('muscleMassKg', { message })
      setError('visceralFatRating', { message })
      setError('bodyWaterPercent', { message })
      setError('boneMassKg', { message })
      setError('bodyFatPercent', { message })
      return
    }
    clearErrors('muscleMassKg')
    clearErrors('visceralFatRating')
    clearErrors('bodyWaterPercent')
    clearErrors('boneMassKg')
    clearErrors('bodyFatPercent')
    const current = {
      muscleMassKg: muscleResult.data,
      visceralFatRating: visceralResult.data,
      bodyWaterPercent: waterResult.data,
      boneMassKg: boneResult.data,
      bodyFatPercent: bodyFatResult.data,
    }
    const isUnusual =
      (current.muscleMassKg !== undefined &&
        (isUnusualMuscleMassKg(current.muscleMassKg) ||
          (previousDayEntry?.muscleMassKg !== undefined &&
            isUnusualMuscleMassDeltaKg(
              current.muscleMassKg,
              previousDayEntry.muscleMassKg,
            )))) ||
      (current.visceralFatRating !== undefined &&
        (isUnusualVisceralFat(current.visceralFatRating) ||
          (previousDayEntry?.visceralFatRating !== undefined &&
            isUnusualVisceralFatDelta(
              current.visceralFatRating,
              previousDayEntry.visceralFatRating,
            )))) ||
      (current.bodyWaterPercent !== undefined &&
        (isUnusualBodyWaterPercent(current.bodyWaterPercent) ||
          (previousDayEntry?.bodyWaterPercent !== undefined &&
            isUnusualBodyWaterPercentDelta(
              current.bodyWaterPercent,
              previousDayEntry.bodyWaterPercent,
            )))) ||
      (current.boneMassKg !== undefined &&
        (isUnusualBoneMassKg(current.boneMassKg) ||
          (previousDayEntry?.boneMassKg !== undefined &&
            isUnusualBoneMassDeltaKg(
              current.boneMassKg,
              previousDayEntry.boneMassKg,
            )))) ||
      (current.bodyFatPercent !== undefined &&
        (isUnusualBodyFatPercent(current.bodyFatPercent) ||
          (previousDayEntry?.bodyFatPercent !== undefined &&
            isUnusualBodyFatPercentDelta(
              current.bodyFatPercent,
              previousDayEntry.bodyFatPercent,
            ))))
    const unchangedSincePendingWarning =
      pendingUnusualBodyComposition !== null &&
      pendingUnusualBodyComposition.muscleMassKg === current.muscleMassKg &&
      pendingUnusualBodyComposition.visceralFatRating ===
        current.visceralFatRating &&
      pendingUnusualBodyComposition.bodyWaterPercent ===
        current.bodyWaterPercent &&
      pendingUnusualBodyComposition.boneMassKg === current.boneMassKg &&
      pendingUnusualBodyComposition.bodyFatPercent === current.bodyFatPercent
    if (isUnusual && !unchangedSincePendingWarning) {
      setPendingUnusualBodyComposition(current)
      return
    }
    setPendingUnusualBodyComposition(null)
    setValue('muscleMassKg', current.muscleMassKg, { shouldDirty: true })
    setValue('visceralFatRating', current.visceralFatRating, {
      shouldDirty: true,
    })
    setValue('bodyWaterPercent', current.bodyWaterPercent, {
      shouldDirty: true,
    })
    setValue('boneMassKg', current.boneMassKg, { shouldDirty: true })
    setValue('bodyFatPercent', current.bodyFatPercent, { shouldDirty: true })
    setIsEditingBodyComposition(false)
    persist({ ...getValues(), ...current })
    setHasSavedBodyComposition(
      current.muscleMassKg !== undefined ||
        current.visceralFatRating !== undefined ||
        current.bodyWaterPercent !== undefined ||
        current.boneMassKg !== undefined ||
        current.bodyFatPercent !== undefined,
    )
  }

  function applyBodyCompositionPatch(patch: {
    muscleMassKg?: number
    visceralFatRating?: number
    bodyWaterPercent?: number
    boneMassKg?: number
    bodyFatPercent?: number
  }) {
    if (patch.muscleMassKg !== undefined) {
      setValue('muscleMassKg', patch.muscleMassKg)
    }
    if (patch.visceralFatRating !== undefined) {
      setValue('visceralFatRating', patch.visceralFatRating)
    }
    if (patch.bodyWaterPercent !== undefined) {
      setValue('bodyWaterPercent', patch.bodyWaterPercent)
    }
    if (patch.boneMassKg !== undefined) {
      setValue('boneMassKg', patch.boneMassKg)
    }
    if (patch.bodyFatPercent !== undefined) {
      setValue('bodyFatPercent', patch.bodyFatPercent)
    }
    saveBodyComposition()
  }

  function discardUnusualBodyCompositionWarning() {
    setPendingUnusualBodyComposition(null)
  }

  function cancelEditBodyComposition() {
    setValue('muscleMassKg', initialValues.muscleMassKg)
    setValue('visceralFatRating', initialValues.visceralFatRating)
    setValue('bodyWaterPercent', initialValues.bodyWaterPercent)
    setValue('boneMassKg', initialValues.boneMassKg)
    setValue('bodyFatPercent', initialValues.bodyFatPercent)
    clearErrors('muscleMassKg')
    clearErrors('visceralFatRating')
    clearErrors('bodyWaterPercent')
    clearErrors('boneMassKg')
    clearErrors('bodyFatPercent')
    setPendingUnusualBodyComposition(null)
    setIsEditingBodyComposition(false)
  }

  function requestDeleteBodyComposition() {
    setIsConfirmingDeleteBodyComposition(true)
  }

  function cancelDeleteBodyComposition() {
    setIsConfirmingDeleteBodyComposition(false)
  }

  function confirmDeleteBodyComposition() {
    const next = {
      ...getValues(),
      muscleMassKg: undefined,
      visceralFatRating: undefined,
      bodyWaterPercent: undefined,
      boneMassKg: undefined,
      bodyFatPercent: undefined,
    }
    reset(next)
    persist(next)
    setIsConfirmingDeleteBodyComposition(false)
    setPendingUnusualBodyComposition(null)
    clearErrors('muscleMassKg')
    clearErrors('visceralFatRating')
    clearErrors('bodyWaterPercent')
    clearErrors('boneMassKg')
    clearErrors('bodyFatPercent')
    setIsEditingBodyComposition(true)
    setHasSavedBodyComposition(false)
  }

  function validateBodyCompositionFieldOnBlur(
    field:
      | 'muscleMassKg'
      | 'visceralFatRating'
      | 'bodyWaterPercent'
      | 'boneMassKg'
      | 'bodyFatPercent',
    schema:
      | typeof muscleMassKgSchema
      | typeof visceralFatRatingSchema
      | typeof bodyWaterPercentSchema
      | typeof boneMassKgSchema
      | typeof bodyFatPercentSchema,
  ) {
    const result = schema.safeParse(parseNumberInput(getValues(field)))
    if (!result.success) {
      setError(field, { message: t.dailyEntry.invalidValueMessage })
    } else {
      clearErrors(field)
    }
  }

  return {
    showBodyCompositionAsDisplay,
    setIsEditingBodyComposition,
    saveBodyComposition,
    applyBodyCompositionPatch,
    pendingUnusualBodyComposition,
    discardUnusualBodyCompositionWarning,
    canCancelBodyCompositionEdit,
    cancelEditBodyComposition,
    isConfirmingDeleteBodyComposition,
    canDeleteBodyComposition,
    requestDeleteBodyComposition,
    confirmDeleteBodyComposition,
    cancelDeleteBodyComposition,
    validateBodyCompositionFieldOnBlur,
  }
}
