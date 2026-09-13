import { useState } from 'react'
import { isBlankSaveValue } from '@/shared/lib/isBlankSaveValue'
import {
  combineHoursMinutes,
  splitHoursMinutes,
} from '@/shared/lib/sleepDuration'
import {
  deepSleepHoursSchema,
  sleepHoursSchema,
} from './dailyEntryFormSchema'
import type { DailyEntryFormFieldApi } from './dailyEntryFormFieldApi'

export function useDailyEntrySleep({
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
  const [hasSavedSleep, setHasSavedSleep] = useState(
    initialValues.sleepHours !== undefined ||
      initialValues.deepSleepHours !== undefined,
  )
  const [isConfirmingDeleteSleep, setIsConfirmingDeleteSleep] = useState(false)
  const [isEditingSleep, setIsEditingSleep] = useState(
    alwaysEditable ||
      (initialValues.sleepHours === undefined &&
        initialValues.deepSleepHours === undefined),
  )
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
  const showSleepAsDisplay = !alwaysEditable && !isEditingSleep
  const canCancelSleepEdit = alwaysEditable || hasSavedSleep
  const canDeleteSleep = hasSavedSleep

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
      setError('sleepHours', { message: t.dailyEntry.invalidValueMessage })
      return
    }
    if (!deepHoursResult.success) {
      setError('deepSleepHours', {
        message: t.dailyEntry.invalidValueMessage,
      })
      return
    }
    if (
      isBlankSaveValue(hoursResult.data) &&
      isBlankSaveValue(deepHoursResult.data)
    ) {
      setError('sleepHours', { message: t.dailyEntry.invalidValueMessage })
      setError('deepSleepHours', {
        message: t.dailyEntry.invalidValueMessage,
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
    setHasSavedSleep(
      sleepHoursValue !== undefined || deepSleepHoursValue !== undefined,
    )
  }

  function applySleepPatch(patch: {
    sleepHours?: number
    deepSleepHours?: number
  }) {
    const sleepHoursValue = patch.sleepHours ?? getValues().sleepHours
    const deepSleepHoursValue =
      patch.deepSleepHours ?? getValues().deepSleepHours
    const hoursResult = sleepHoursSchema.safeParse(sleepHoursValue)
    const deepHoursResult = deepSleepHoursSchema.safeParse(deepSleepHoursValue)
    if (!hoursResult.success || !deepHoursResult.success) return
    const sleepParts = splitHoursMinutes(sleepHoursValue)
    const deepParts = splitHoursMinutes(deepSleepHoursValue)
    setSleepHoursPart(sleepParts.hours)
    setSleepMinutesPart(sleepParts.minutes)
    setDeepSleepHoursPart(deepParts.hours)
    setDeepSleepMinutesPart(deepParts.minutes)
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
    setHasSavedSleep(
      sleepHoursValue !== undefined || deepSleepHoursValue !== undefined,
    )
  }

  function cancelEditSleep() {
    setValue('sleepHours', initialValues.sleepHours)
    setValue('deepSleepHours', initialValues.deepSleepHours)
    setSleepHoursPart(initialSleepParts.hours)
    setSleepMinutesPart(initialSleepParts.minutes)
    setDeepSleepHoursPart(initialDeepSleepParts.hours)
    setDeepSleepMinutesPart(initialDeepSleepParts.minutes)
    clearErrors('sleepHours')
    clearErrors('deepSleepHours')
    setIsEditingSleep(false)
  }

  function requestDeleteSleep() {
    setIsConfirmingDeleteSleep(true)
  }

  function cancelDeleteSleep() {
    setIsConfirmingDeleteSleep(false)
  }

  function confirmDeleteSleep() {
    const next = {
      ...getValues(),
      sleepHours: undefined,
      deepSleepHours: undefined,
    }
    reset(next)
    persist(next)
    setSleepHoursPart('')
    setSleepMinutesPart('')
    setDeepSleepHoursPart('')
    setDeepSleepMinutesPart('')
    setIsConfirmingDeleteSleep(false)
    clearErrors('sleepHours')
    clearErrors('deepSleepHours')
    setIsEditingSleep(true)
    setHasSavedSleep(false)
  }

  return {
    showSleepAsDisplay,
    setIsEditingSleep,
    sleepHoursPart,
    setSleepHoursPart,
    sleepMinutesPart,
    setSleepMinutesPart,
    deepSleepHoursPart,
    setDeepSleepHoursPart,
    deepSleepMinutesPart,
    setDeepSleepMinutesPart,
    saveSleep,
    applySleepPatch,
    canCancelSleepEdit,
    cancelEditSleep,
    isConfirmingDeleteSleep,
    canDeleteSleep,
    requestDeleteSleep,
    confirmDeleteSleep,
    cancelDeleteSleep,
  }
}
