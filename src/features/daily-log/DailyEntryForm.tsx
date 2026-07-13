import { useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import type { DailyEntry } from '@/domain/dailyEntry'
import { formatNumber, useLocale, useTranslation } from '@/i18n'
import { parseNumberInput } from '@/shared/lib/parseNumberInput'
import { Button } from '@/shared/ui/button'
import { InfoTooltip } from '@/shared/ui/info-tooltip'
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
  const locale = useLocale()
  const schema = useMemo(() => makeDailyEntryFormSchema(t), [t])
  const [addAmount, setAddAmount] = useState('')
  const [lastAdded, setLastAdded] = useState<number | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    watch,
    formState: { errors },
  } = useForm<DailyEntryFormValues>({
    resolver: zodResolver(schema),
    defaultValues: entryToFormValues(existingEntry),
  })

  const caloriesConsumed = watch('caloriesConsumed')

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
    setLastAdded(increment)
    setAddAmount('')
  }

  function undoLastAdd() {
    if (lastAdded === null) return
    const current = getValues('caloriesConsumed') ?? 0
    const next = current - lastAdded
    setValue('caloriesConsumed', next > 0 ? next : undefined, {
      shouldValidate: true,
      shouldDirty: true,
    })
    setLastAdded(null)
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
              {formatNumber(caloriesConsumed ?? 0, locale, 0)}
            </span>
            <span className="text-sm text-muted-foreground">
              {t.dailyEntry.caloriesTodaySuffix}
            </span>
          </span>
          {lastAdded !== null && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={undoLastAdd}
            >
              {t.dailyEntry.undoLastAddButton}
            </Button>
          )}
        </div>
        {errors.caloriesConsumed && (
          <p className="text-sm text-destructive">
            {errors.caloriesConsumed.message}
          </p>
        )}
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
