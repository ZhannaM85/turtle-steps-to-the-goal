import { useState } from 'react'
import type { DailyEntry } from '@/domain/dailyEntry'
import { useDailyEntryStore } from '@/stores'
import { isBlankSaveValue } from '@/shared/lib/isBlankSaveValue'
import { weightSchema } from './dailyEntryFormSchema'
import type { DailyEntryFormFieldApi } from './dailyEntryFormFieldApi'
import {
  isUnusualWeightDeltaKg,
  isUnusualWeightKg,
} from './unusualEntryThresholds'

export function useDailyEntryWeight({
  alwaysEditable,
  initialValues,
  t,
  getValues,
  setValue,
  reset,
  setError,
  clearErrors,
  persist,
  previousDayEntry,
}: DailyEntryFormFieldApi & { previousDayEntry: DailyEntry | null }) {
  const [isEditingWeight, setIsEditingWeight] = useState(
    alwaysEditable || initialValues.weightKg === undefined,
  )
  const [isConfirmingDeleteWeight, setIsConfirmingDeleteWeight] =
    useState(false)
  const [hasSavedWeight, setHasSavedWeight] = useState(
    initialValues.weightKg !== undefined,
  )
  const [pendingUnusualWeight, setPendingUnusualWeight] = useState<
    number | null
  >(null)
  const showWeightAsDisplay = !alwaysEditable && !isEditingWeight
  const canCancelWeightEdit = alwaysEditable || hasSavedWeight
  const canDeleteWeight = hasSavedWeight

  function saveWeight() {
    const result = weightSchema.safeParse(getValues('weightKg'))
    if (!result.success || isBlankSaveValue(result.data)) {
      setError('weightKg', { message: t.dailyEntry.invalidValueMessage })
      setPendingUnusualWeight(null)
      return
    }
    clearErrors('weightKg')
    const isUnusual =
      isUnusualWeightKg(result.data) ||
      (previousDayEntry?.weightKg !== undefined &&
        isUnusualWeightDeltaKg(result.data, previousDayEntry.weightKg))
    if (isUnusual && pendingUnusualWeight !== result.data) {
      setPendingUnusualWeight(result.data)
      return
    }
    setPendingUnusualWeight(null)
    setIsEditingWeight(false)
    setHasSavedWeight(true)
    persist(getValues())
    useDailyEntryStore.getState().noteWeightSaved()
  }

  function discardUnusualWeightWarning() {
    setPendingUnusualWeight(null)
  }

  function cancelEditWeight() {
    setValue('weightKg', initialValues.weightKg)
    clearErrors('weightKg')
    setPendingUnusualWeight(null)
    setIsEditingWeight(false)
  }

  function requestDeleteWeight() {
    setIsConfirmingDeleteWeight(true)
  }

  function cancelDeleteWeight() {
    setIsConfirmingDeleteWeight(false)
  }

  function confirmDeleteWeight() {
    const next = { ...getValues(), weightKg: undefined }
    reset(next)
    persist(next)
    setIsConfirmingDeleteWeight(false)
    setPendingUnusualWeight(null)
    setIsEditingWeight(true)
    setHasSavedWeight(false)
  }

  return {
    showWeightAsDisplay,
    isEditingWeight,
    setIsEditingWeight,
    pendingUnusualWeight,
    saveWeight,
    discardUnusualWeightWarning,
    canCancelWeightEdit,
    cancelEditWeight,
    isConfirmingDeleteWeight,
    canDeleteWeight,
    requestDeleteWeight,
    confirmDeleteWeight,
    cancelDeleteWeight,
  }
}
