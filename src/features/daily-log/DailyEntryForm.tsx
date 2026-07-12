import { useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import type { DailyEntry } from '@/domain/dailyEntry'
import { useTranslation } from '@/i18n'
import { parseNumberInput } from '@/shared/lib/parseNumberInput'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { NumberInput } from '@/shared/ui/number-input'
import { TextField } from '@/shared/ui/text-field'
import { entryToFormValues, formValuesToEntry } from './dailyEntryFormMapping'
import {
  makeDailyEntryFormSchema,
  type DailyEntryFormValues,
} from './dailyEntryFormSchema'

export interface DailyEntryFormProps {
  date: string
  existingEntry: DailyEntry | null
  onSubmit: (entry: DailyEntry) => void
}

export function DailyEntryForm({
  date,
  existingEntry,
  onSubmit,
}: DailyEntryFormProps) {
  const t = useTranslation()
  const schema = useMemo(() => makeDailyEntryFormSchema(t), [t])
  const [addAmount, setAddAmount] = useState('')

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<DailyEntryFormValues>({
    resolver: zodResolver(schema),
    defaultValues: entryToFormValues(existingEntry),
  })

  function submit(values: DailyEntryFormValues) {
    onSubmit(formValuesToEntry(values, date, existingEntry))
  }

  function addCalories() {
    const increment = parseNumberInput(addAmount)
    if (!increment || increment <= 0) return
    const current = getValues('caloriesConsumed') ?? 0
    setValue('caloriesConsumed', current + increment, {
      shouldValidate: true,
      shouldDirty: true,
    })
    setAddAmount('')
  }

  return (
    <form
      onSubmit={handleSubmit(submit)}
      className="flex flex-col gap-4"
      noValidate
    >
      <NumberInput
        label={t.dailyEntry.weightLabel}
        error={errors.weightKg?.message}
        {...register('weightKg', { setValueAs: parseNumberInput })}
      />

      <div className="flex flex-col gap-1.5">
        <NumberInput
          label={t.dailyEntry.caloriesLabel}
          error={errors.caloriesConsumed?.message}
          tooltip={t.dailyEntry.caloriesTooltip}
          tooltipLabel={t.dailyEntry.caloriesTooltipLabel}
          {...register('caloriesConsumed', { setValueAs: parseNumberInput })}
        />
        <div className="flex items-center gap-2">
          <Input
            type="text"
            inputMode="decimal"
            aria-label={t.dailyEntry.addCaloriesLabel}
            placeholder={t.dailyEntry.addCaloriesPlaceholder}
            value={addAmount}
            onChange={(e) => setAddAmount(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addCalories()
              }
            }}
            className="h-7 w-24"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addCalories}
          >
            {t.dailyEntry.addButton}
          </Button>
        </div>
      </div>

      <TextField
        label={t.dailyEntry.noteLabel}
        error={errors.note?.message}
        {...register('note')}
      />

      <Button type="submit" className="self-start">
        {existingEntry ? t.dailyEntry.updateButton : t.dailyEntry.logButton}
      </Button>
    </form>
  )
}
