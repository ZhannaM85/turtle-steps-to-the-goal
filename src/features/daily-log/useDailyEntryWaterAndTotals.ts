import { useState } from 'react'
import type { DayTotals } from '@/domain/dailyEntry'
import { parseNumberInput } from '@/shared/lib/parseNumberInput'
import { dayTotalsSchema, waterMlSchema } from './dailyEntryFormSchema'
import type { DailyEntryFormFieldApi } from './dailyEntryFormFieldApi'

export function useDailyEntryWaterAndTotals({
  alwaysEditable,
  initialValues,
  t,
  getValues,
  setValue,
  persist,
  dayTotals,
}: DailyEntryFormFieldApi & { dayTotals: DayTotals | undefined }) {
  const [isEditingDayTotals, setIsEditingDayTotals] = useState(
    alwaysEditable || initialValues.dayTotals === undefined,
  )
  const [dayTotalsKcalInput, setDayTotalsKcalInput] = useState('')
  const [dayTotalsProteinInput, setDayTotalsProteinInput] = useState('')
  const [dayTotalsFatInput, setDayTotalsFatInput] = useState('')
  const [dayTotalsCarbsInput, setDayTotalsCarbsInput] = useState('')
  const [dayTotalsFiberInput, setDayTotalsFiberInput] = useState('')
  const [dayTotalsError, setDayTotalsError] = useState<string | null>(null)
  const [isConfirmingDeleteDayTotals, setIsConfirmingDeleteDayTotals] =
    useState(false)

  function addWaterEntry(amountMl: number) {
    const result = waterMlSchema.safeParse(amountMl)
    if (!result.success) return
    if (result.data === 0) return
    const now = new Date()
    const timeDrunk = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    const entries = [
      ...(getValues('waterEntries') ?? []),
      { id: crypto.randomUUID(), amountMl: result.data, timeDrunk },
    ]
    setValue('waterEntries', entries, { shouldDirty: true })
    persist({ ...getValues(), waterEntries: entries })
  }

  function removeWaterEntry(id: string) {
    const entries = (getValues('waterEntries') ?? []).filter(
      (entry) => entry.id !== id,
    )
    setValue('waterEntries', entries, { shouldDirty: true })
    persist({ ...getValues(), waterEntries: entries })
  }

  function updateWaterEntry(
    id: string,
    patch: { amountMl: number; timeDrunk?: string },
  ) {
    const entries = (getValues('waterEntries') ?? []).map((entry) => {
      if (entry.id !== id) return entry
      return {
        id: entry.id,
        amountMl: patch.amountMl,
        ...(patch.timeDrunk ? { timeDrunk: patch.timeDrunk } : {}),
      }
    })
    setValue('waterEntries', entries, { shouldDirty: true })
    persist({ ...getValues(), waterEntries: entries })
  }

  function startEditDayTotals() {
    setDayTotalsKcalInput(
      dayTotals?.amountKcal !== undefined ? String(dayTotals.amountKcal) : '',
    )
    setDayTotalsProteinInput(
      dayTotals?.proteinG !== undefined ? String(dayTotals.proteinG) : '',
    )
    setDayTotalsFatInput(
      dayTotals?.fatG !== undefined ? String(dayTotals.fatG) : '',
    )
    setDayTotalsCarbsInput(
      dayTotals?.carbsG !== undefined ? String(dayTotals.carbsG) : '',
    )
    setDayTotalsFiberInput(
      dayTotals?.fiberG !== undefined ? String(dayTotals.fiberG) : '',
    )
    setDayTotalsError(null)
    setIsEditingDayTotals(true)
  }

  function saveDayTotals() {
    const amountKcal = parseNumberInput(dayTotalsKcalInput)
    if (amountKcal === undefined) {
      setDayTotalsError(t.dailyEntry.invalidValueMessage)
      return
    }
    const next: DayTotals = { amountKcal }
    const proteinG = parseNumberInput(dayTotalsProteinInput)
    const fatG = parseNumberInput(dayTotalsFatInput)
    const carbsG = parseNumberInput(dayTotalsCarbsInput)
    const fiberG = parseNumberInput(dayTotalsFiberInput)
    if (proteinG !== undefined) next.proteinG = proteinG
    if (fatG !== undefined) next.fatG = fatG
    if (carbsG !== undefined) next.carbsG = carbsG
    if (fiberG !== undefined) next.fiberG = fiberG
    const result = dayTotalsSchema.safeParse(next)
    if (!result.success) {
      setDayTotalsError(t.dailyEntry.invalidValueMessage)
      return
    }
    setDayTotalsError(null)
    setValue('dayTotals', result.data, { shouldDirty: true })
    persist({ ...getValues(), dayTotals: result.data })
    setIsEditingDayTotals(false)
  }

  function clearDayTotals() {
    setValue('dayTotals', undefined, { shouldDirty: true })
    persist({ ...getValues(), dayTotals: undefined })
    setDayTotalsKcalInput('')
    setDayTotalsProteinInput('')
    setDayTotalsFatInput('')
    setDayTotalsCarbsInput('')
    setDayTotalsFiberInput('')
    setDayTotalsError(null)
    setIsEditingDayTotals(true)
  }

  function cancelEditDayTotals() {
    setDayTotalsKcalInput(
      dayTotals?.amountKcal !== undefined ? String(dayTotals.amountKcal) : '',
    )
    setDayTotalsProteinInput(
      dayTotals?.proteinG !== undefined ? String(dayTotals.proteinG) : '',
    )
    setDayTotalsFatInput(
      dayTotals?.fatG !== undefined ? String(dayTotals.fatG) : '',
    )
    setDayTotalsCarbsInput(
      dayTotals?.carbsG !== undefined ? String(dayTotals.carbsG) : '',
    )
    setDayTotalsFiberInput(
      dayTotals?.fiberG !== undefined ? String(dayTotals.fiberG) : '',
    )
    setDayTotalsError(null)
    if (dayTotals !== undefined) {
      setIsEditingDayTotals(false)
    }
  }

  function requestDeleteDayTotals() {
    setIsConfirmingDeleteDayTotals(true)
  }

  function cancelDeleteDayTotals() {
    setIsConfirmingDeleteDayTotals(false)
  }

  function confirmDeleteDayTotals() {
    setIsConfirmingDeleteDayTotals(false)
    clearDayTotals()
  }

  return {
    addWaterEntry,
    removeWaterEntry,
    updateWaterEntry,
    isEditingDayTotals,
    dayTotalsKcalInput,
    setDayTotalsKcalInput,
    dayTotalsProteinInput,
    setDayTotalsProteinInput,
    dayTotalsFatInput,
    setDayTotalsFatInput,
    dayTotalsCarbsInput,
    setDayTotalsCarbsInput,
    dayTotalsFiberInput,
    setDayTotalsFiberInput,
    dayTotalsError,
    saveDayTotals,
    clearDayTotals,
    startEditDayTotals,
    cancelEditDayTotals,
    isConfirmingDeleteDayTotals,
    requestDeleteDayTotals,
    confirmDeleteDayTotals,
    cancelDeleteDayTotals,
  }
}
