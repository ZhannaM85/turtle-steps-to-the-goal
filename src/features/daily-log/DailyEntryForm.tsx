import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import type { DailyEntry } from '@/domain/dailyEntry'
import { parseNumberInput } from '@/shared/lib/parseNumberInput'
import { Button } from '@/shared/ui/button'
import { NumberInput } from '@/shared/ui/number-input'
import { TextField } from '@/shared/ui/text-field'
import { entryToFormValues, formValuesToEntry } from './dailyEntryFormMapping'
import {
  dailyEntryFormSchema,
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
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DailyEntryFormValues>({
    resolver: zodResolver(dailyEntryFormSchema),
    defaultValues: entryToFormValues(existingEntry),
  })

  function submit(values: DailyEntryFormValues) {
    onSubmit(formValuesToEntry(values, date, existingEntry))
  }

  return (
    <form
      onSubmit={handleSubmit(submit)}
      className="flex flex-col gap-4"
      noValidate
    >
      <NumberInput
        label="Weight (kg)"
        error={errors.weightKg?.message}
        {...register('weightKg', { setValueAs: parseNumberInput })}
      />

      <NumberInput
        label="Calories"
        error={errors.caloriesConsumed?.message}
        {...register('caloriesConsumed', { setValueAs: parseNumberInput })}
      />

      <TextField
        label="Note (optional)"
        error={errors.note?.message}
        {...register('note')}
      />

      <Button type="submit" className="self-start">
        {existingEntry ? 'Update entry' : 'Log entry'}
      </Button>
    </form>
  )
}
