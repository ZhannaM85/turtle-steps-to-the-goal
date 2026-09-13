import { useState } from 'react'
import { isBlankSaveValue } from '@/shared/lib/isBlankSaveValue'
import {
  hipCmSchema,
  stepsSchema,
  waistCmSchema,
} from './dailyEntryFormSchema'
import type { DailyEntryFormFieldApi } from './dailyEntryFormFieldApi'

export function useDailyEntryStepsAndMeasurements({
  alwaysEditable,
  initialValues,
  t,
  getValues,
  setValue,
  reset,
  setError,
  clearErrors,
  persist,
}: DailyEntryFormFieldApi) {
  const [isConfirmingDeleteSteps, setIsConfirmingDeleteSteps] = useState(false)
  const [savedSteps, setSavedSteps] = useState(initialValues.steps)
  const [isEditingSteps, setIsEditingSteps] = useState(
    alwaysEditable || initialValues.steps === undefined,
  )
  const [hasSavedBodyMeasurements, setHasSavedBodyMeasurements] = useState(
    initialValues.waistCm !== undefined || initialValues.hipCm !== undefined,
  )
  const [isConfirmingDeleteBodyMeasurements, setIsConfirmingDeleteBodyMeasurements] =
    useState(false)
  const [isEditingBodyMeasurements, setIsEditingBodyMeasurements] = useState(
    alwaysEditable ||
      (initialValues.waistCm === undefined &&
        initialValues.hipCm === undefined),
  )
  const showStepsAsDisplay = !alwaysEditable && !isEditingSteps
  const showBodyMeasurementsAsDisplay =
    !alwaysEditable && !isEditingBodyMeasurements
  const canCancelStepsEdit = alwaysEditable || savedSteps !== undefined
  const canDeleteSteps = savedSteps !== undefined
  const canCancelBodyMeasurementsEdit =
    alwaysEditable || hasSavedBodyMeasurements
  const canDeleteBodyMeasurements = hasSavedBodyMeasurements

  function saveSteps() {
    const result = stepsSchema.safeParse(getValues('steps'))
    if (!result.success || isBlankSaveValue(result.data)) {
      setError('steps', { message: t.dailyEntry.invalidValueMessage })
      return
    }
    clearErrors('steps')
    setIsEditingSteps(false)
    persist(getValues())
    setSavedSteps(result.data)
  }

  function cancelEditSteps() {
    setValue('steps', savedSteps)
    clearErrors('steps')
    if (alwaysEditable || savedSteps !== undefined) {
      setIsEditingSteps(false)
    }
  }

  function requestDeleteSteps() {
    setIsConfirmingDeleteSteps(true)
  }

  function cancelDeleteSteps() {
    setIsConfirmingDeleteSteps(false)
  }

  function confirmDeleteSteps() {
    const next = { ...getValues(), steps: undefined }
    reset(next)
    persist(next)
    setIsConfirmingDeleteSteps(false)
    clearErrors('steps')
    setIsEditingSteps(true)
    setSavedSteps(undefined)
  }

  function saveBodyMeasurements() {
    const waistResult = waistCmSchema.safeParse(getValues('waistCm'))
    const hipResult = hipCmSchema.safeParse(getValues('hipCm'))
    if (!waistResult.success) {
      setError('waistCm', { message: t.dailyEntry.invalidValueMessage })
      return
    }
    if (!hipResult.success) {
      setError('hipCm', { message: t.dailyEntry.invalidValueMessage })
      return
    }
    if (
      isBlankSaveValue(waistResult.data) &&
      isBlankSaveValue(hipResult.data)
    ) {
      setError('waistCm', { message: t.dailyEntry.invalidValueMessage })
      setError('hipCm', { message: t.dailyEntry.invalidValueMessage })
      return
    }
    clearErrors('waistCm')
    clearErrors('hipCm')
    setIsEditingBodyMeasurements(false)
    persist(getValues())
    setHasSavedBodyMeasurements(
      waistResult.data !== undefined || hipResult.data !== undefined,
    )
  }

  function cancelEditBodyMeasurements() {
    setValue('waistCm', initialValues.waistCm)
    setValue('hipCm', initialValues.hipCm)
    clearErrors('waistCm')
    clearErrors('hipCm')
    setIsEditingBodyMeasurements(false)
  }

  function requestDeleteBodyMeasurements() {
    setIsConfirmingDeleteBodyMeasurements(true)
  }

  function cancelDeleteBodyMeasurements() {
    setIsConfirmingDeleteBodyMeasurements(false)
  }

  function confirmDeleteBodyMeasurements() {
    const next = { ...getValues(), waistCm: undefined, hipCm: undefined }
    reset(next)
    persist(next)
    setIsConfirmingDeleteBodyMeasurements(false)
    clearErrors('waistCm')
    clearErrors('hipCm')
    setIsEditingBodyMeasurements(true)
    setHasSavedBodyMeasurements(false)
  }

  return {
    showStepsAsDisplay,
    setIsEditingSteps,
    saveSteps,
    canCancelStepsEdit,
    cancelEditSteps,
    isConfirmingDeleteSteps,
    canDeleteSteps,
    requestDeleteSteps,
    confirmDeleteSteps,
    cancelDeleteSteps,
    showBodyMeasurementsAsDisplay,
    setIsEditingBodyMeasurements,
    saveBodyMeasurements,
    canCancelBodyMeasurementsEdit,
    cancelEditBodyMeasurements,
    isConfirmingDeleteBodyMeasurements,
    canDeleteBodyMeasurements,
    requestDeleteBodyMeasurements,
    confirmDeleteBodyMeasurements,
    cancelDeleteBodyMeasurements,
  }
}
