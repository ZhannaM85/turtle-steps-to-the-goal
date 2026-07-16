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
import { Check, GripVertical, Pencil, type LucideIcon, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import type {
  CalorieEntry,
  DailyEntry,
  Emotion,
  MealEmotion,
} from '@/domain/dailyEntry'
import { totalCalories, totalCarbs, totalFat, totalProtein } from '@/domain/dailyEntry'
import {
  formatExactNumber,
  formatNumber,
  useLocale,
  useTranslation,
  type Dictionary,
  type Locale,
} from '@/i18n'
import { DAY_EMOTIONS, MEAL_EMOTIONS } from '@/shared/lib/emotionIcons'
import { macrosSummaryText } from '@/shared/lib/macroDisplay'
import { parseNumberInput } from '@/shared/lib/parseNumberInput'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { InfoTooltip } from '@/shared/ui/info-tooltip'
import { Input } from '@/shared/ui/input'
import { useMealItemStore } from '@/stores'
import { entryToFormValues, formValuesToEntry } from './dailyEntryFormMapping'
import { FoodPickerDialog } from './FoodPickerDialog'
import {
  deepSleepHoursSchema,
  noteSchema,
  sleepHoursSchema,
  stepsSchema,
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

/** Generic over both the day's mood (Emotion) and a meal's reaction
 * (MealEmotion, #54) — the two sets differ, so options/labelFor are passed
 * in rather than hardcoded, but the picker UI itself is identical. */
function EmotionPicker<E extends string>({
  value,
  onChange,
  options,
  labelFor,
  contextLabel,
}: {
  value: E | undefined
  onChange: (emotion: E | undefined) => void
  options: { value: E; Icon?: LucideIcon; emoji?: string }[]
  labelFor: (emotion: E) => string
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
      {options.map(({ value: emotion, Icon, emoji }) => {
        const label = labelFor(emotion)
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
            {Icon ? (
              <Icon aria-hidden="true" />
            ) : (
              <span aria-hidden="true" className="text-base leading-none">
                {emoji}
              </span>
            )}
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
  editProtein: string
  editFat: string
  editCarbs: string
  editTime: string
  editNote: string
  editEmotion: MealEmotion | undefined
  onEditAmountChange: (value: string) => void
  onEditProteinChange: (value: string) => void
  onEditFatChange: (value: string) => void
  onEditCarbsChange: (value: string) => void
  onEditTimeChange: (value: string) => void
  onEditNoteChange: (value: string) => void
  onEditEmotionChange: (emotion: MealEmotion | undefined) => void
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
  editProtein,
  editFat,
  editCarbs,
  editTime,
  editNote,
  editEmotion,
  onEditAmountChange,
  onEditProteinChange,
  onEditFatChange,
  onEditCarbsChange,
  onEditTimeChange,
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
  const mealEmotionOption = MEAL_EMOTIONS.find((e) => e.value === entry.emotion)
  const macrosSummary = macrosSummaryText(
    entry.proteinG,
    entry.fatG,
    entry.carbsG,
    locale,
    t,
  )

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
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">
              {t.dailyEntry.proteinLabel}
            </span>
            <Input
              type="text"
              inputMode="decimal"
              aria-label={`${t.dailyEntry.proteinLabel} — ${t.dailyEntry.mealLabel(position)}`}
              value={editProtein}
              onChange={(e) => onEditProteinChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  onSaveEdit()
                }
              }}
              className="h-7 w-14"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">
              {t.dailyEntry.fatLabel}
            </span>
            <Input
              type="text"
              inputMode="decimal"
              aria-label={`${t.dailyEntry.fatLabel} — ${t.dailyEntry.mealLabel(position)}`}
              value={editFat}
              onChange={(e) => onEditFatChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  onSaveEdit()
                }
              }}
              className="h-7 w-14"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">
              {t.dailyEntry.carbsLabel}
            </span>
            <Input
              type="text"
              inputMode="decimal"
              aria-label={`${t.dailyEntry.carbsLabel} — ${t.dailyEntry.mealLabel(position)}`}
              value={editCarbs}
              onChange={(e) => onEditCarbsChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  onSaveEdit()
                }
              }}
              className="h-7 w-14"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">
              {t.dailyEntry.timeEatenLabel}
            </span>
            <Input
              type="time"
              aria-label={`${t.dailyEntry.timeEatenLabel} — ${t.dailyEntry.mealLabel(position)}`}
              value={editTime}
              onChange={(e) => onEditTimeChange(e.target.value)}
              className="h-7 w-24"
            />
          </div>
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
            options={MEAL_EMOTIONS}
            labelFor={t.dailyEntry.mealEmotionLabel}
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
          {entry.timeEaten && (
            <span className="text-muted-foreground">
              · {entry.timeEaten}
            </span>
          )}
          {mealEmotionOption && (
            <>
              {mealEmotionOption.Icon ? (
                <mealEmotionOption.Icon
                  aria-hidden="true"
                  className="size-3.5 text-muted-foreground"
                />
              ) : (
                <span aria-hidden="true" className="text-sm leading-none">
                  {mealEmotionOption.emoji}
                </span>
              )}
              <span className="sr-only">
                {t.dailyEntry.mealEmotionLabel(entry.emotion!)}
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
      {macrosSummary && (
        <p className="text-xs text-muted-foreground">{macrosSummary}</p>
      )}
    </li>
  )
}

/** Sleep is stored as decimal hours (`sleepHours`/`deepSleepHours`), but
 * entered as separate hours+minutes fields (#69) — typing "7.5" on a mobile
 * numeric keypad was awkward, whole hours + whole minutes is the natural
 * way people think about sleep duration. These two functions are the only
 * place that conversion happens. */
function splitHoursMinutes(value: number | undefined): {
  hours: string
  minutes: string
} {
  if (value === undefined) return { hours: '', minutes: '' }
  const hours = Math.floor(value)
  const minutes = Math.round((value - hours) * 60)
  return { hours: String(hours), minutes: String(minutes) }
}

function combineHoursMinutes(
  hoursText: string,
  minutesText: string,
): number | undefined {
  const hours = parseNumberInput(hoursText)
  const minutes = parseNumberInput(minutesText)
  if (hours === undefined && minutes === undefined) return undefined
  return (hours ?? 0) + (minutes ?? 0) / 60
}

/** Default for a newly-added meal's time-eaten field (#65) — "the time when
 * user enters the entry". Not used for editing an existing meal, which
 * reflects whatever time (if any) was already saved on it. */
function currentTimeHHMM(): string {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
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
  const [addProtein, setAddProtein] = useState('')
  const [addFat, setAddFat] = useState('')
  const [addCarbs, setAddCarbs] = useState('')
  const [addNote, setAddNote] = useState('')
  const [addEmotion, setAddEmotion] = useState<MealEmotion | undefined>(
    undefined,
  )
  // Time eaten (#65) — starts empty rather than defaulting to "now" (#82):
  // a pre-filled value read as already-confirmed/correct and went unnoticed
  // when it didn't match. Resets to empty after each add, same as the
  // other add-* fields.
  const [addTime, setAddTime] = useState('')
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
  const [isEditingSleep, setIsEditingSleep] = useState(
    alwaysEditable ||
      (initialValues.sleepHours === undefined &&
        initialValues.deepSleepHours === undefined),
  )
  // Hours+minutes sub-fields for sleep entry (#69) — kept as local text
  // state rather than react-hook-form fields, since the form's own
  // sleepHours/deepSleepHours stay decimal; these are combined into that
  // decimal only on save (see combineHoursMinutes).
  const initialSleepParts = splitHoursMinutes(initialValues.sleepHours)
  const initialDeepSleepParts = splitHoursMinutes(initialValues.deepSleepHours)
  const [sleepHoursPart, setSleepHoursPart] = useState(
    initialSleepParts.hours,
  )
  const [sleepMinutesPart, setSleepMinutesPart] = useState(
    initialSleepParts.minutes,
  )
  const [deepSleepHoursPart, setDeepSleepHoursPart] = useState(
    initialDeepSleepParts.hours,
  )
  const [deepSleepMinutesPart, setDeepSleepMinutesPart] = useState(
    initialDeepSleepParts.minutes,
  )
  const [isEditingSteps, setIsEditingSteps] = useState(
    alwaysEditable || initialValues.steps === undefined,
  )
  // Quantity-based entry against the static food list (#62) — an alternative
  // to manual kcal/macro entry, not a replacement for it.
  const [isFoodPickerOpen, setIsFoodPickerOpen] = useState(false)
  const [editingMealId, setEditingMealId] = useState<string | null>(null)
  const [editMealAmount, setEditMealAmount] = useState('')
  const [editMealProtein, setEditMealProtein] = useState('')
  const [editMealFat, setEditMealFat] = useState('')
  const [editMealCarbs, setEditMealCarbs] = useState('')
  const [editMealTime, setEditMealTime] = useState('')
  const [editMealNote, setEditMealNote] = useState('')
  const [editMealEmotion, setEditMealEmotion] = useState<
    MealEmotion | undefined
  >(undefined)
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
  const sleepHours = watch('sleepHours')
  const deepSleepHours = watch('deepSleepHours')
  const steps = watch('steps')
  const dayEmotion = watch('emotion')
  const calorieEntries = watch('calorieEntries') ?? []
  const DayEmotionIcon = DAY_EMOTIONS.find((e) => e.value === dayEmotion)?.Icon
  const dayMacrosSummary = macrosSummaryText(
    totalProtein(calorieEntries),
    totalFat(calorieEntries),
    totalCarbs(calorieEntries),
    locale,
    t,
  )

  const showWeightAsDisplay = !alwaysEditable && !isEditingWeight
  const showNoteAsDisplay = !alwaysEditable && !isEditingNote
  const showSleepAsDisplay = !alwaysEditable && !isEditingSleep
  const showStepsAsDisplay = !alwaysEditable && !isEditingSteps

  function setDayEmotion(emotion: Emotion | undefined) {
    setValue('emotion', emotion, { shouldDirty: true })
  }

  function persist(values: DailyEntryFormValues) {
    onSave(formValuesToEntry(values, date, entryIdentity))
  }

  // Macros are optional supplementary data (#51) with no per-field error
  // UI, unlike kcal's required-and-guarded amount — invalid/garbage input
  // (NaN) or a negative number is silently treated as "not provided" rather
  // than surfacing a validation error for a low-stakes field.
  function parseOptionalMacro(raw: string): number | undefined {
    const parsed = parseNumberInput(raw)
    return parsed !== undefined && Number.isFinite(parsed) && parsed >= 0
      ? parsed
      : undefined
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

  function saveSleep() {
    const sleepHoursValue = combineHoursMinutes(sleepHoursPart, sleepMinutesPart)
    const deepSleepHoursValue = combineHoursMinutes(
      deepSleepHoursPart,
      deepSleepMinutesPart,
    )
    const hoursResult = sleepHoursSchema.safeParse(sleepHoursValue)
    const deepHoursResult = deepSleepHoursSchema.safeParse(deepSleepHoursValue)
    if (!hoursResult.success) {
      setError('sleepHours', { message: hoursResult.error.issues[0].message })
      return
    }
    if (!deepHoursResult.success) {
      setError('deepSleepHours', {
        message: deepHoursResult.error.issues[0].message,
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
  }

  function saveSteps() {
    const result = stepsSchema.safeParse(getValues('steps'))
    if (!result.success) {
      setError('steps', { message: result.error.issues[0].message })
      return
    }
    clearErrors('steps')
    setIsEditingSteps(false)
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
        proteinG: parseOptionalMacro(addProtein),
        fatG: parseOptionalMacro(addFat),
        carbsG: parseOptionalMacro(addCarbs),
        timeEaten: addTime || undefined,
        createdAt: new Date().toISOString(),
      },
    ])
    if (addNote.trim()) touchMealItem(addNote)
    setAddAmount('')
    setAddProtein('')
    setAddFat('')
    setAddCarbs('')
    setAddNote('')
    setAddEmotion(undefined)
    setAddTime('')
  }

  // Quantity-based entry against the static food list (#62) — the dialog
  // already computed kcal/macros scaled by quantity; this just adds the
  // result as a normal meal, same flat CalorieEntry shape as manual entry.
  function addFoodEntry(values: {
    amountKcal: number
    proteinG: number
    fatG: number
    carbsG: number
    note: string
  }) {
    setCalorieEntries([
      ...calorieEntries,
      {
        id: crypto.randomUUID(),
        amountKcal: values.amountKcal,
        proteinG: values.proteinG,
        fatG: values.fatG,
        carbsG: values.carbsG,
        note: values.note,
        timeEaten: currentTimeHHMM(),
        createdAt: new Date().toISOString(),
      },
    ])
  }

  function startEditMeal(entry: CalorieEntry) {
    setEditingMealId(entry.id)
    setEditMealAmount(String(entry.amountKcal))
    setEditMealProtein(entry.proteinG === undefined ? '' : String(entry.proteinG))
    setEditMealFat(entry.fatG === undefined ? '' : String(entry.fatG))
    setEditMealCarbs(entry.carbsG === undefined ? '' : String(entry.carbsG))
    setEditMealTime(entry.timeEaten ?? '')
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
              proteinG: parseOptionalMacro(editMealProtein),
              fatG: parseOptionalMacro(editMealFat),
              carbsG: parseOptionalMacro(editMealCarbs),
              timeEaten: editMealTime || undefined,
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

      {showSleepAsDisplay ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">
            {t.dailyEntry.sleepLabel}
          </span>
          <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
            <span className="text-sm text-foreground">
              {t.dailyEntry.sleepSummary(
                sleepHours === undefined
                  ? '—'
                  : `${splitHoursMinutes(sleepHours).hours}${t.dailyEntry.hoursUnit} ${splitHoursMinutes(sleepHours).minutes}${t.dailyEntry.minutesUnit}`,
                deepSleepHours === undefined
                  ? '—'
                  : `${splitHoursMinutes(deepSleepHours).hours}${t.dailyEntry.hoursUnit} ${splitHoursMinutes(deepSleepHours).minutes}${t.dailyEntry.minutesUnit}`,
              )}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t.dailyEntry.editSleepLabel}
              onClick={() => {
                const parts = splitHoursMinutes(sleepHours)
                const deepParts = splitHoursMinutes(deepSleepHours)
                setSleepHoursPart(parts.hours)
                setSleepMinutesPart(parts.minutes)
                setDeepSleepHoursPart(deepParts.hours)
                setDeepSleepMinutesPart(deepParts.minutes)
                setIsEditingSleep(true)
              }}
            >
              <Pencil aria-hidden="true" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">{t.dailyEntry.sleepLabel}</span>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">
                {t.dailyEntry.sleepHoursLabel}
              </span>
              <div className="flex items-center gap-1">
                <Input
                  type="text"
                  inputMode="numeric"
                  aria-label={`${t.dailyEntry.sleepHoursLabel} — ${t.dailyEntry.hoursFieldLabel}`}
                  aria-invalid={errors.sleepHours ? true : undefined}
                  className="h-8 w-12"
                  value={sleepHoursPart}
                  onChange={(e) => setSleepHoursPart(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      saveSleep()
                    }
                  }}
                />
                <span className="text-xs text-muted-foreground">
                  {t.dailyEntry.hoursUnit}
                </span>
                <Input
                  type="text"
                  inputMode="numeric"
                  aria-label={`${t.dailyEntry.sleepHoursLabel} — ${t.dailyEntry.minutesFieldLabel}`}
                  aria-invalid={errors.sleepHours ? true : undefined}
                  className="h-8 w-12"
                  value={sleepMinutesPart}
                  onChange={(e) => setSleepMinutesPart(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      saveSleep()
                    }
                  }}
                />
                <span className="text-xs text-muted-foreground">
                  {t.dailyEntry.minutesUnit}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">
                {t.dailyEntry.deepSleepLabel}
              </span>
              <div className="flex items-center gap-1">
                <Input
                  type="text"
                  inputMode="numeric"
                  aria-label={`${t.dailyEntry.deepSleepLabel} — ${t.dailyEntry.hoursFieldLabel}`}
                  aria-invalid={errors.deepSleepHours ? true : undefined}
                  className="h-8 w-12"
                  value={deepSleepHoursPart}
                  onChange={(e) => setDeepSleepHoursPart(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      saveSleep()
                    }
                  }}
                />
                <span className="text-xs text-muted-foreground">
                  {t.dailyEntry.hoursUnit}
                </span>
                <Input
                  type="text"
                  inputMode="numeric"
                  aria-label={`${t.dailyEntry.deepSleepLabel} — ${t.dailyEntry.minutesFieldLabel}`}
                  aria-invalid={errors.deepSleepHours ? true : undefined}
                  className="h-8 w-12"
                  value={deepSleepMinutesPart}
                  onChange={(e) => setDeepSleepMinutesPart(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      saveSleep()
                    }
                  }}
                />
                <span className="text-xs text-muted-foreground">
                  {t.dailyEntry.minutesUnit}
                </span>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label={t.dailyEntry.saveSleepLabel}
              onClick={saveSleep}
            >
              <Check aria-hidden="true" />
            </Button>
          </div>
          {(errors.sleepHours || errors.deepSleepHours) && (
            <p className="text-sm text-destructive">
              {errors.sleepHours?.message ?? errors.deepSleepHours?.message}
            </p>
          )}
        </div>
      )}

      {showStepsAsDisplay ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">
            {t.dailyEntry.stepsLabel}
          </span>
          <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
            <span className="text-sm text-foreground">
              {steps === undefined ? '—' : formatNumber(steps, locale, 0)}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t.dailyEntry.editStepsLabel}
              onClick={() => setIsEditingSteps(true)}
            >
              <Pencil aria-hidden="true" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">
            {t.dailyEntry.stepsLabel}
          </span>
          <div className="flex items-center gap-2">
            <Input
              type="text"
              inputMode="numeric"
              aria-label={t.dailyEntry.stepsLabel}
              aria-invalid={errors.steps ? true : undefined}
              className="h-8 w-24"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  saveSteps()
                }
              }}
              {...register('steps', { setValueAs: parseNumberInput })}
            />
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label={t.dailyEntry.saveStepsLabel}
              onClick={saveSteps}
            >
              <Check aria-hidden="true" />
            </Button>
          </div>
          {errors.steps && (
            <p className="text-sm text-destructive">{errors.steps.message}</p>
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
        {dayMacrosSummary && (
          <p className="text-xs text-muted-foreground">{dayMacrosSummary}</p>
        )}

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
                    editProtein={editMealProtein}
                    editFat={editMealFat}
                    editCarbs={editMealCarbs}
                    editTime={editMealTime}
                    editNote={editMealNote}
                    editEmotion={editMealEmotion}
                    onEditAmountChange={setEditMealAmount}
                    onEditProteinChange={setEditMealProtein}
                    onEditFatChange={setEditMealFat}
                    onEditCarbsChange={setEditMealCarbs}
                    onEditTimeChange={setEditMealTime}
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
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">
                {t.dailyEntry.kcalUnit}
              </span>
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
                className="h-7 w-16"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">
                {t.dailyEntry.proteinLabel}
              </span>
              <Input
                type="text"
                inputMode="decimal"
                aria-label={t.dailyEntry.proteinLabel}
                value={addProtein}
                onChange={(e) => setAddProtein(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addCalories()
                  }
                }}
                className="h-7 w-14"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">
                {t.dailyEntry.fatLabel}
              </span>
              <Input
                type="text"
                inputMode="decimal"
                aria-label={t.dailyEntry.fatLabel}
                value={addFat}
                onChange={(e) => setAddFat(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addCalories()
                  }
                }}
                className="h-7 w-14"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">
                {t.dailyEntry.carbsLabel}
              </span>
              <Input
                type="text"
                inputMode="decimal"
                aria-label={t.dailyEntry.carbsLabel}
                value={addCarbs}
                onChange={(e) => setAddCarbs(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addCalories()
                  }
                }}
                className="h-7 w-14"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">
                {t.dailyEntry.timeEatenLabel}
              </span>
              <Input
                type="time"
                aria-label={t.dailyEntry.timeEatenLabel}
                value={addTime}
                onChange={(e) => setAddTime(e.target.value)}
                className="h-7 w-24"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addCalories}
            >
              {t.dailyEntry.addButton}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsFoodPickerOpen(true)}
            >
              {t.dailyEntry.addFoodButton}
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
            <EmotionPicker
              value={addEmotion}
              onChange={setAddEmotion}
              options={MEAL_EMOTIONS}
              labelFor={t.dailyEntry.mealEmotionLabel}
            />
          </div>
          {/* No text children: an <option>'s text content is a real DOM
           * text node findable by getByText, which risks colliding with the
           * exact same text elsewhere on the page once a saved note becomes
           * a suggestion (touchMealItem persists the raw note as the
           * library entry's name, #50) — value alone is what autocomplete
           * actually keys off. */}
          <datalist id={MEAL_ITEMS_DATALIST_ID}>
            {mealItems.map((item) => (
              <option key={item.id} value={item.name} />
            ))}
          </datalist>
          {/* Lazily mounted (#78) — the food list grew to 300+ items, and
           * rendering it unconditionally meant every DailyEntryForm render
           * paid that cost even with the dialog closed. Only mounting it
           * while open keeps the closed (overwhelmingly common) case cheap. */}
          {isFoodPickerOpen && (
            <FoodPickerDialog
              open={isFoodPickerOpen}
              onOpenChange={setIsFoodPickerOpen}
              onAdd={addFoodEntry}
            />
          )}
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
              placeholder={t.dailyEntry.noteFieldPlaceholder}
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
              options={DAY_EMOTIONS}
              labelFor={t.dailyEntry.emotionLabel}
              contextLabel={t.dailyEntry.dayMoodLabel}
            />
          </div>
        </div>
      )}
    </form>
  )
}
