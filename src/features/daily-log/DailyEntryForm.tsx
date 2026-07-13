import { useMemo, useState } from 'react'
import {
  Check,
  Frown,
  Meh,
  Pencil,
  Smile,
  Trash2,
  type LucideIcon,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import type { CalorieEntry, DailyEntry, Emotion } from '@/domain/dailyEntry'
import { totalCalories } from '@/domain/dailyEntry'
import {
  formatNumber,
  useLocale,
  useTranslation,
  type Dictionary,
} from '@/i18n'
import { parseNumberInput } from '@/shared/lib/parseNumberInput'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { InfoTooltip } from '@/shared/ui/info-tooltip'
import { Input } from '@/shared/ui/input'
import { entryToFormValues, formValuesToEntry } from './dailyEntryFormMapping'
import {
  noteSchema,
  weightSchema,
  type DailyEntryFormValues,
} from './dailyEntryFormSchema'

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

const EMOTIONS: { value: Emotion; Icon: LucideIcon }[] = [
  { value: 'happy', Icon: Smile },
  { value: 'neutral', Icon: Meh },
  { value: 'unhappy', Icon: Frown },
]

function EmotionPicker({
  value,
  onChange,
  t,
  contextLabel,
}: {
  value: Emotion | undefined
  onChange: (emotion: Emotion | undefined) => void
  t: Dictionary
  /**
   * Disambiguates this picker's buttons from another EmotionPicker visible
   * at the same time (e.g. the always-present Add-flow picker plus a meal
   * row's own picker while that row is being edited) — without it, two
   * buttons named plain "Happy" would both exist on screen at once.
   */
  contextLabel?: string
}) {
  return (
    <div className="flex items-center gap-1">
      {EMOTIONS.map(({ value: emotion, Icon }) => {
        const label = t.dailyEntry.emotionLabel(emotion)
        return (
          <Button
            key={emotion}
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={contextLabel ? `${label} — ${contextLabel}` : label}
            aria-pressed={value === emotion}
            className={cn(value === emotion && 'bg-muted text-foreground')}
            onClick={() => onChange(value === emotion ? undefined : emotion)}
          >
            <Icon aria-hidden="true" />
          </Button>
        )
      })}
    </div>
  )
}

export function DailyEntryForm({
  date,
  existingEntry,
  onSave,
  alwaysEditable = false,
}: DailyEntryFormProps) {
  const t = useTranslation()
  const locale = useLocale()
  // A stable identity for this day's entry, reused across every independent
  // save in this session (weight, note, each meal) so they all update the
  // same record instead of each save inventing a new id. Computed once —
  // existingEntry won't reactively reflect earlier saves made in this same
  // session, since the parent doesn't necessarily re-pass a fresh prop
  // after every one of potentially many saves.
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
  const [addAmount, setAddAmount] = useState('')
  const [addNote, setAddNote] = useState('')
  const [addEmotion, setAddEmotion] = useState<Emotion | undefined>(undefined)
  // Whether Weight/Note render as an editable input rather than read-only
  // display + pencil. Deliberately NOT derived from the live watched value —
  // that would flip to display mode mid-keystroke on every first character
  // typed into a blank field. Starts editable only when there's nothing
  // saved yet; a pencil click re-opens it explicitly, a successful save
  // collapses it back.
  const [isEditingWeight, setIsEditingWeight] = useState(
    alwaysEditable || initialValues.weightKg === undefined,
  )
  const [isEditingNote, setIsEditingNote] = useState(
    alwaysEditable || !initialValues.note,
  )
  const [editingMealId, setEditingMealId] = useState<string | null>(null)
  const [editMealAmount, setEditMealAmount] = useState('')
  const [editMealNote, setEditMealNote] = useState('')
  const [editMealEmotion, setEditMealEmotion] = useState<Emotion | undefined>(
    undefined,
  )
  const [confirmDeleteMealId, setConfirmDeleteMealId] = useState<string | null>(
    null,
  )

  const {
    register,
    getValues,
    setValue,
    watch,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<DailyEntryFormValues>({
    defaultValues: initialValues,
  })

  const weightKg = watch('weightKg')
  const note = watch('note')
  const calorieEntries = watch('calorieEntries') ?? []

  const showWeightAsDisplay = !alwaysEditable && !isEditingWeight
  const showNoteAsDisplay = !alwaysEditable && !isEditingNote

  function persist(values: DailyEntryFormValues) {
    onSave(formValuesToEntry(values, date, entryIdentity))
  }

  function saveWeight() {
    const result = weightSchema.safeParse(getValues('weightKg'))
    if (!result.success) {
      setError('weightKg', { message: result.error.issues[0].message })
      return
    }
    clearErrors('weightKg')
    setIsEditingWeight(false)
    persist(getValues())
  }

  function saveNote() {
    const result = noteSchema.safeParse(getValues('note'))
    if (!result.success) {
      setError('note', { message: result.error.issues[0].message })
      return
    }
    clearErrors('note')
    setIsEditingNote(false)
    persist(getValues())
  }

  function setCalorieEntries(next: CalorieEntry[]) {
    setValue('calorieEntries', next, { shouldDirty: true })
    persist({ ...getValues(), calorieEntries: next })
  }

  function addCalories() {
    const increment = parseNumberInput(addAmount)
    if (!increment || increment <= 0) return
    setCalorieEntries([
      ...calorieEntries,
      {
        id: crypto.randomUUID(),
        amountKcal: increment,
        note: addNote.trim() || undefined,
        emotion: addEmotion,
        createdAt: new Date().toISOString(),
      },
    ])
    setAddAmount('')
    setAddNote('')
    setAddEmotion(undefined)
  }

  function startEditMeal(entry: CalorieEntry) {
    setEditingMealId(entry.id)
    setEditMealAmount(String(entry.amountKcal))
    setEditMealNote(entry.note ?? '')
    setEditMealEmotion(entry.emotion)
  }

  function saveEditMeal() {
    const amount = parseNumberInput(editMealAmount)
    if (!amount || amount <= 0) return
    setCalorieEntries(
      calorieEntries.map((entry) =>
        entry.id === editingMealId
          ? {
              ...entry,
              amountKcal: amount,
              note: editMealNote.trim() || undefined,
              emotion: editMealEmotion,
            }
          : entry,
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
    <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-4">
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
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">
            {t.dailyEntry.weightLabel}
          </span>
          <div className="flex items-center gap-2">
            <Input
              type="text"
              inputMode="decimal"
              aria-label={t.dailyEntry.weightLabel}
              aria-invalid={errors.weightKg ? true : undefined}
              className="h-8 flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  saveWeight()
                }
              }}
              {...register('weightKg', { setValueAs: parseNumberInput })}
            />
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label={t.dailyEntry.saveWeightLabel}
              onClick={saveWeight}
            >
              <Check aria-hidden="true" />
            </Button>
          </div>
          {errors.weightKg && (
            <p className="text-sm text-destructive">
              {errors.weightKg.message}
            </p>
          )}
        </div>
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
              const EmotionIcon = EMOTIONS.find(
                (e) => e.value === entry.emotion,
              )?.Icon

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
                    className="flex flex-col gap-1.5 px-1 py-1"
                  >
                    <div className="flex items-center gap-2">
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
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        aria-label={`${t.dailyEntry.mealNoteLabel} — ${t.dailyEntry.mealLabel(position)}`}
                        placeholder={t.dailyEntry.mealNotePlaceholder}
                        value={editMealNote}
                        onChange={(e) => setEditMealNote(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            saveEditMeal()
                          }
                        }}
                        className="h-7 flex-1"
                      />
                      <EmotionPicker
                        value={editMealEmotion}
                        onChange={setEditMealEmotion}
                        t={t}
                        contextLabel={t.dailyEntry.mealLabel(position)}
                      />
                    </div>
                  </li>
                )
              }

              return (
                <li key={entry.id} className="flex flex-col gap-0.5 px-1 py-1">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-sm">
                      {t.dailyEntry.mealLabel(position)} —{' '}
                      {formatNumber(entry.amountKcal, locale, 0)}{' '}
                      {t.dailyEntry.kcalUnit}
                      {EmotionIcon && (
                        <>
                          <EmotionIcon
                            aria-hidden="true"
                            className="size-3.5 text-muted-foreground"
                          />
                          <span className="sr-only">
                            {t.dailyEntry.emotionLabel(entry.emotion!)}
                          </span>
                        </>
                      )}
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
                  </div>
                  {entry.note && (
                    <p className="text-xs text-muted-foreground">
                      {entry.note}
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        )}

        <div className="flex flex-col gap-1.5">
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
          <div className="flex items-center gap-2">
            <Input
              type="text"
              aria-label={t.dailyEntry.mealNoteLabel}
              placeholder={t.dailyEntry.mealNotePlaceholder}
              value={addNote}
              onChange={(e) => setAddNote(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addCalories()
                }
              }}
              className="h-7 flex-1"
            />
            <EmotionPicker value={addEmotion} onChange={setAddEmotion} t={t} />
          </div>
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
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">{t.dailyEntry.noteLabel}</span>
          <div className="flex items-center gap-2">
            <Input
              type="text"
              aria-label={t.dailyEntry.noteLabel}
              aria-invalid={errors.note ? true : undefined}
              className="h-8 flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  saveNote()
                }
              }}
              {...register('note')}
            />
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label={t.dailyEntry.saveNoteLabel}
              onClick={saveNote}
            >
              <Check aria-hidden="true" />
            </Button>
          </div>
          {errors.note && (
            <p className="text-sm text-destructive">{errors.note.message}</p>
          )}
        </div>
      )}
    </form>
  )
}
