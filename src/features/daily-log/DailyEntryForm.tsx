import { useEffect, useMemo, useState } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Check, GripVertical, Pencil, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import type { CalorieEntry, DailyEntry, Emotion } from '@/domain/dailyEntry'
import { totalCalories } from '@/domain/dailyEntry'
import {
  formatExactNumber,
  formatNumber,
  useLocale,
  useTranslation,
  type Dictionary,
  type Locale,
} from '@/i18n'
import { EMOTIONS } from '@/shared/lib/emotionIcons'
import { parseNumberInput } from '@/shared/lib/parseNumberInput'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { InfoTooltip } from '@/shared/ui/info-tooltip'
import { Input } from '@/shared/ui/input'
import { useMealItemStore } from '@/stores'
import { entryToFormValues, formValuesToEntry } from './dailyEntryFormMapping'
import {
  noteSchema,
  weightSchema,
  type DailyEntryFormValues,
} from './dailyEntryFormSchema'

// Shared by both the add-meal and edit-meal note inputs (#50) — the
// <datalist> itself is rendered once in DailyEntryForm; `list` just needs
// to reference this id, it doesn't need to be a DOM ancestor.
const MEAL_ITEMS_DATALIST_ID = 'meal-items-datalist'

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

interface MealListItemProps {
  entry: CalorieEntry
  position: number
  t: Dictionary
  locale: Locale
  isEditing: boolean
  isConfirmingDelete: boolean
  editAmount: string
  editNote: string
  editEmotion: Emotion | undefined
  onEditAmountChange: (value: string) => void
  onEditNoteChange: (value: string) => void
  onEditEmotionChange: (emotion: Emotion | undefined) => void
  onStartEdit: () => void
  onSaveEdit: () => void
  onRequestDelete: () => void
  onConfirmDelete: () => void
  onCancelDelete: () => void
}

function MealListItem({
  entry,
  position,
  t,
  locale,
  isEditing,
  isConfirmingDelete,
  editAmount,
  editNote,
  editEmotion,
  onEditAmountChange,
  onEditNoteChange,
  onEditEmotionChange,
  onStartEdit,
  onSaveEdit,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
}: MealListItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.id, disabled: isEditing || isConfirmingDelete })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const EmotionIcon = EMOTIONS.find((e) => e.value === entry.emotion)?.Icon

  if (isConfirmingDelete) {
    return (
      <li
        ref={setNodeRef}
        style={style}
        className="flex items-center gap-2 rounded-lg px-1 py-1 whitespace-nowrap"
      >
        <span className="text-sm text-muted-foreground">
          {t.history.confirmDeleteLabel}
        </span>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={onConfirmDelete}
        >
          {t.history.confirmDeleteYes}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancelDelete}
        >
          {t.history.confirmDeleteNo}
        </Button>
      </li>
    )
  }

  if (isEditing) {
    return (
      <li
        ref={setNodeRef}
        style={style}
        className="flex flex-col gap-1.5 px-1 py-1"
      >
        <div className="flex items-center gap-2">
          <Input
            type="text"
            inputMode="decimal"
            aria-label={t.dailyEntry.mealLabel(position)}
            value={editAmount}
            onChange={(e) => onEditAmountChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                onSaveEdit()
              }
            }}
            className="h-7 w-24"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t.dailyEntry.saveButton}
            onClick={onSaveEdit}
          >
            <Check aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t.dailyEntry.deleteMealLabel(position)}
            onClick={onRequestDelete}
          >
            <Trash2 aria-hidden="true" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="text"
            list={MEAL_ITEMS_DATALIST_ID}
            aria-label={`${t.dailyEntry.mealNoteLabel} — ${t.dailyEntry.mealLabel(position)}`}
            placeholder={t.dailyEntry.mealNotePlaceholder}
            value={editNote}
            onChange={(e) => onEditNoteChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                onSaveEdit()
              }
            }}
            className="h-7 flex-1"
          />
          <EmotionPicker
            value={editEmotion}
            onChange={onEditEmotionChange}
            t={t}
            contextLabel={t.dailyEntry.mealLabel(position)}
          />
        </div>
      </li>
    )
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex flex-col gap-0.5 px-1 py-1',
        isDragging && 'opacity-50',
      )}
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm">
          <button
            type="button"
            aria-label={t.dailyEntry.reorderMealLabel(position)}
            className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical aria-hidden="true" className="size-4" />
          </button>
          {t.dailyEntry.mealLabel(position)} —{' '}
          {formatNumber(entry.amountKcal, locale, 0)} {t.dailyEntry.kcalUnit}
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
          onClick={onStartEdit}
        >
          <Pencil aria-hidden="true" />
        </Button>
      </div>
      {entry.note && (
        <p className="text-xs text-muted-foreground">{entry.note}</p>
      )}
    </li>
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
  const dragSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  // Reusable meal-name suggestions (#50) — loaded once per form mount, a
  // library shared across days, not scoped to this entry.
  const mealItems = useMealItemStore((state) => state.items)
  const loadMealItems = useMealItemStore((state) => state.loadItems)
  const touchMealItem = useMealItemStore((state) => state.touch)
  useEffect(() => {
    loadMealItems()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
  const dayEmotion = watch('emotion')
  const calorieEntries = watch('calorieEntries') ?? []
  const DayEmotionIcon = EMOTIONS.find((e) => e.value === dayEmotion)?.Icon

  const showWeightAsDisplay = !alwaysEditable && !isEditingWeight
  const showNoteAsDisplay = !alwaysEditable && !isEditingNote

  function setDayEmotion(emotion: Emotion | undefined) {
    setValue('emotion', emotion, { shouldDirty: true })
  }

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
    if (addNote.trim()) touchMealItem(addNote)
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
    if (editMealNote.trim()) touchMealItem(editMealNote)
    setEditingMealId(null)
  }

  function confirmDeleteMeal() {
    setCalorieEntries(
      calorieEntries.filter((entry) => entry.id !== confirmDeleteMealId),
    )
    if (editingMealId === confirmDeleteMealId) setEditingMealId(null)
    setConfirmDeleteMealId(null)
  }

  function handleMealDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = calorieEntries.findIndex((entry) => entry.id === active.id)
    const newIndex = calorieEntries.findIndex((entry) => entry.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    setCalorieEntries(arrayMove(calorieEntries, oldIndex, newIndex))
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
              {formatExactNumber(weightKg!, locale)} {t.common.kg}
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
          <DndContext
            sensors={dragSensors}
            collisionDetection={closestCenter}
            onDragEnd={handleMealDragEnd}
          >
            <SortableContext
              items={calorieEntries.map((entry) => entry.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="flex flex-col gap-1">
                {calorieEntries.map((entry, index) => (
                  <MealListItem
                    key={entry.id}
                    entry={entry}
                    position={index + 1}
                    t={t}
                    locale={locale}
                    isEditing={editingMealId === entry.id}
                    isConfirmingDelete={confirmDeleteMealId === entry.id}
                    editAmount={editMealAmount}
                    editNote={editMealNote}
                    editEmotion={editMealEmotion}
                    onEditAmountChange={setEditMealAmount}
                    onEditNoteChange={setEditMealNote}
                    onEditEmotionChange={setEditMealEmotion}
                    onStartEdit={() => startEditMeal(entry)}
                    onSaveEdit={saveEditMeal}
                    onRequestDelete={() => setConfirmDeleteMealId(entry.id)}
                    onConfirmDelete={confirmDeleteMeal}
                    onCancelDelete={() => setConfirmDeleteMealId(null)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
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
              list={MEAL_ITEMS_DATALIST_ID}
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
          <datalist id={MEAL_ITEMS_DATALIST_ID}>
            {mealItems.map((item) => (
              <option key={item.id} value={item.name}>
                {item.name}
              </option>
            ))}
          </datalist>
        </div>
      </div>

      {showNoteAsDisplay ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">{t.dailyEntry.noteLabel}</span>
          <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
            <span className="flex items-center gap-1.5 text-sm text-foreground">
              {note}
              {DayEmotionIcon && (
                <>
                  <DayEmotionIcon
                    aria-hidden="true"
                    className="size-3.5 text-muted-foreground"
                  />
                  <span className="sr-only">
                    {t.dailyEntry.emotionLabel(dayEmotion!)}
                  </span>
                </>
              )}
            </span>
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
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {t.dailyEntry.dayMoodLabel}
            </span>
            <EmotionPicker
              value={dayEmotion}
              onChange={setDayEmotion}
              t={t}
              contextLabel={t.dailyEntry.dayMoodLabel}
            />
          </div>
        </div>
      )}
    </form>
  )
}
