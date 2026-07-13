import { useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, Pencil, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import type { CalorieEntry, DailyEntry } from '@/domain/dailyEntry'
import { totalCalories } from '@/domain/dailyEntry'
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
  /**
   * Skips the read-only-display-until-pencil-clicked treatment for Weight
   * and Note, rendering them as plain always-editable inputs instead. Used
   * by History's inline edit, where clicking "Edit entry" already is the
   * explicit edit gesture — a second layer of per-field pencils there would
   * just be redundant. Itemized calorie editing is unaffected either way.
   */
  alwaysEditable?: boolean
}

export function DailyEntryForm({
  date,
  existingEntry,
  onSubmit,
  alwaysEditable = false,
}: DailyEntryFormProps) {
  const t = useTranslation()
  const locale = useLocale()
  const schema = useMemo(() => makeDailyEntryFormSchema(t), [t])
  const initialValues = useMemo(
    () => entryToFormValues(existingEntry),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
  const [addAmount, setAddAmount] = useState('')
  // Whether Weight/Note render as an editable input rather than read-only
  // display + pencil. Deliberately NOT derived from the live watched value —
  // that would flip to display mode mid-keystroke on every first character
  // typed into a blank field. Starts editable only when there's nothing
  // saved yet; a pencil click or clearing the field re-opens it explicitly.
  const [isEditingWeight, setIsEditingWeight] = useState(
    alwaysEditable || initialValues.weightKg === undefined,
  )
  const [isEditingNote, setIsEditingNote] = useState(
    alwaysEditable || !initialValues.note,
  )
  const [editingMealId, setEditingMealId] = useState<string | null>(null)
  const [editMealAmount, setEditMealAmount] = useState('')
  const [confirmDeleteMealId, setConfirmDeleteMealId] = useState<string | null>(
    null,
  )

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<DailyEntryFormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialValues,
  })

  const weightKg = watch('weightKg')
  const note = watch('note')
  const calorieEntries = watch('calorieEntries') ?? []

  const showWeightAsDisplay = !alwaysEditable && !isEditingWeight
  const showNoteAsDisplay = !alwaysEditable && !isEditingNote

  function submit(values: DailyEntryFormValues) {
    onSubmit(formValuesToEntry(values, date, existingEntry))
    setIsEditingWeight(values.weightKg === undefined)
    setIsEditingNote(!values.note)
  }

  function setCalorieEntries(next: CalorieEntry[]) {
    setValue('calorieEntries', next, {
      shouldValidate: true,
      shouldDirty: true,
    })
  }

  function addCalories() {
    const increment = parseNumberInput(addAmount)
    if (!increment || increment <= 0) return
    setCalorieEntries([
      ...calorieEntries,
      {
        id: crypto.randomUUID(),
        amountKcal: increment,
        createdAt: new Date().toISOString(),
      },
    ])
    setAddAmount('')
  }

  function startEditMeal(entry: CalorieEntry) {
    setEditingMealId(entry.id)
    setEditMealAmount(String(entry.amountKcal))
  }

  function saveEditMeal() {
    const amount = parseNumberInput(editMealAmount)
    if (!amount || amount <= 0) return
    setCalorieEntries(
      calorieEntries.map((entry) =>
        entry.id === editingMealId ? { ...entry, amountKcal: amount } : entry,
      ),
    )
    setEditingMealId(null)
  }

  function confirmDeleteMeal() {
    setCalorieEntries(
      calorieEntries.filter((entry) => entry.id !== confirmDeleteMealId),
    )
    if (editingMealId === confirmDeleteMealId) setEditingMealId(null)
    setConfirmDeleteMealId(null)
  }

  return (
    <form
      onSubmit={handleSubmit(submit)}
      className="flex flex-col gap-4"
      noValidate
    >
      {showWeightAsDisplay ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">
            {t.dailyEntry.weightLabel}
          </span>
          <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
            <span className="text-sm text-foreground">
              {formatNumber(weightKg!, locale)} {t.common.kg}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t.dailyEntry.editWeightLabel}
              onClick={() => setIsEditingWeight(true)}
            >
              <Pencil aria-hidden="true" />
            </Button>
          </div>
        </div>
      ) : (
        <NumberInput
          label={t.dailyEntry.weightLabel}
          error={errors.weightKg?.message}
          {...register('weightKg', { setValueAs: parseNumberInput })}
        />
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
        {calorieEntries.length > 0 && (
          <ul className="flex flex-col gap-1">
            {calorieEntries.map((entry, index) => {
              const position = index + 1
              if (confirmDeleteMealId === entry.id) {
                return (
                  <li
                    key={entry.id}
                    className="flex items-center gap-2 rounded-lg px-1 py-1 whitespace-nowrap"
                  >
                    <span className="text-sm text-muted-foreground">
                      {t.history.confirmDeleteLabel}
                    </span>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={confirmDeleteMeal}
                    >
                      {t.history.confirmDeleteYes}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmDeleteMealId(null)}
                    >
                      {t.history.confirmDeleteNo}
                    </Button>
                  </li>
                )
              }

              if (editingMealId === entry.id) {
                return (
                  <li
                    key={entry.id}
                    className="flex items-center gap-2 px-1 py-1"
                  >
                    <Input
                      type="text"
                      inputMode="decimal"
                      aria-label={t.dailyEntry.mealLabel(position)}
                      value={editMealAmount}
                      onChange={(e) => setEditMealAmount(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          saveEditMeal()
                        }
                      }}
                      className="h-7 w-24"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t.dailyEntry.saveButton}
                      onClick={saveEditMeal}
                    >
                      <Check aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t.dailyEntry.deleteMealLabel(position)}
                      onClick={() => setConfirmDeleteMealId(entry.id)}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </li>
                )
              }

              return (
                <li
                  key={entry.id}
                  className="flex items-center justify-between px-1 py-1 text-sm"
                >
                  <span>
                    {t.dailyEntry.mealLabel(position)} —{' '}
                    {formatNumber(entry.amountKcal, locale, 0)}{' '}
                    {t.dailyEntry.kcalUnit}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t.dailyEntry.editMealLabel(position)}
                    onClick={() => startEditMeal(entry)}
                  >
                    <Pencil aria-hidden="true" />
                  </Button>
                </li>
              )
            })}
          </ul>
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

      {showNoteAsDisplay ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">{t.dailyEntry.noteLabel}</span>
          <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
            <span className="text-sm text-foreground">{note}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t.dailyEntry.editNoteLabel}
              onClick={() => setIsEditingNote(true)}
            >
              <Pencil aria-hidden="true" />
            </Button>
          </div>
        </div>
      ) : (
        <TextField
          label={t.dailyEntry.noteLabel}
          error={errors.note?.message}
          {...register('note')}
        />
      )}

      <Button type="submit" className="self-start">
        {existingEntry ? t.dailyEntry.updateButton : t.dailyEntry.logButton}
      </Button>
    </form>
  )
}
