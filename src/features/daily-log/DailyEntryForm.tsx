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
import {
  Check,
  GripVertical,
  Pencil,
  type LucideIcon,
  Trash2,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import type {
  CalorieEntry,
  CalorieItem,
  DailyEntry,
  Emotion,
  MealEmotion,
} from '@/domain/dailyEntry'
import {
  calorieEntryCarbs,
  calorieEntryFat,
  calorieEntryKcal,
  calorieEntryProtein,
  totalCalories,
  totalCarbs,
  totalFat,
  totalProtein,
} from '@/domain/dailyEntry'
import type { MealItem } from '@/domain/mealItem'
import {
  formatExactNumber,
  formatNumber,
  useLocale,
  useTranslation,
  type Dictionary,
  type Locale,
} from '@/i18n'
import { DAY_EMOTIONS, MEAL_EMOTIONS } from '@/shared/lib/emotionIcons'
import {
  macrosSummaryText,
  macrosSummaryTextCompact,
} from '@/shared/lib/macroDisplay'
import {
  formatComputedTotal,
  parseOptionalMacro,
  ratesFromAbsolute,
  scaleFromPer100g,
} from '@/shared/lib/macroScaling'
import { parseNumberInput } from '@/shared/lib/parseNumberInput'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { InfoTooltip } from '@/shared/ui/info-tooltip'
import { Input } from '@/shared/ui/input'
import { useMealItemStore } from '@/stores'
import { entryToFormValues, formValuesToEntry } from './dailyEntryFormMapping'
import { FoodPickerDialog } from './FoodPickerDialog'
import { MealNoteAutocomplete } from './MealNoteAutocomplete'
import {
  deepSleepHoursSchema,
  noteSchema,
  sleepHoursSchema,
  stepsSchema,
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
            // bg-muted alone (the old style) sits too close to
            // --background in dark mode to read as "selected" — and for
            // emoji options (unlike the lucide-icon options) text-foreground
            // has no visual effect at all, so the background/border was the
            // *only* indicator (#84). --primary is deliberately
            // high-contrast against background in every mood theme, so a
            // border + tint reliably reads as selected everywhere.
            className={cn(
              value === emotion &&
                'border-2 border-primary bg-primary/15 text-foreground',
            )}
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

/** One item's draft fields while its parent meal group is being edited
 * (#81) — plain strings, same pattern as the rest of this form's add/edit
 * local state. `id` is the real item id for an existing item, or a fresh
 * uuid for a blank row added during this edit session; either way it's
 * used as-is for the saved item's id, so editing doesn't churn ids that
 * didn't change. */
interface EditItemDraft {
  id: string
  name: string
  amount: string
  protein: string
  fat: string
  carbs: string
  amountG: string
}

function itemDraftFrom(item: CalorieItem): EditItemDraft {
  const rates = ratesFromAbsolute(
    item.amountKcal,
    item.proteinG,
    item.fatG,
    item.carbsG,
    item.amountG,
  )
  return {
    id: item.id,
    name: item.name ?? '',
    amount: String(rates.kcal100),
    protein: rates.protein100 === undefined ? '' : String(rates.protein100),
    fat: rates.fat100 === undefined ? '' : String(rates.fat100),
    carbs: rates.carbs100 === undefined ? '' : String(rates.carbs100),
    amountG: String(rates.quantity),
  }
}

function blankItemDraft(): EditItemDraft {
  return {
    id: crypto.randomUUID(),
    name: '',
    amount: '',
    protein: '',
    fat: '',
    carbs: '',
    amountG: '100',
  }
}

interface MealListItemProps {
  entry: CalorieEntry
  position: number
  t: Dictionary
  locale: Locale
  mealItems: MealItem[]
  isEditing: boolean
  isConfirmingDelete: boolean
  editItems: EditItemDraft[]
  editTime: string
  editNote: string
  editEmotion: MealEmotion | undefined
  onEditItemFieldChange: (
    id: string,
    field: 'name' | 'amount' | 'protein' | 'fat' | 'carbs' | 'amountG',
    value: string,
  ) => void
  onEditItemSelectMealItem: (id: string, item: MealItem) => void
  onAddEditItem: () => void
  onRemoveEditItem: (id: string) => void
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
  mealItems,
  isEditing,
  isConfirmingDelete,
  editItems,
  editTime,
  editNote,
  editEmotion,
  onEditItemFieldChange,
  onEditItemSelectMealItem,
  onAddEditItem,
  onRemoveEditItem,
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
    calorieEntryProtein(entry),
    calorieEntryFat(entry),
    calorieEntryCarbs(entry),
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
        className="flex flex-col gap-2 rounded-lg bg-muted/40 px-1 py-1.5"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            {t.dailyEntry.mealLabel(position)}
          </span>
          <div className="flex items-center gap-1">
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
        </div>

        {/* One row per item in this meal group (#81) — name + kcal +
         * macros each, with its own delete button. Removing every item
         * and saving deletes the whole group, same end result as the
         * group Delete button above. */}
        <ul className="flex flex-col gap-1.5">
          {editItems.map((item) => {
            // Live preview of this item's computed total (#98), same
            // rationale as the add row's own preview below.
            const itemKcal100 = parseNumberInput(item.amount)
            const itemTotalPreview =
              itemKcal100 && itemKcal100 > 0
                ? formatComputedTotal(
                    scaleFromPer100g(
                      itemKcal100,
                      parseOptionalMacro(item.protein),
                      parseOptionalMacro(item.fat),
                      parseOptionalMacro(item.carbs),
                      item.amountG,
                    ),
                    locale,
                    t,
                  )
                : null
            return (
              <li key={item.id} className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <MealNoteAutocomplete
                    listInputId={`edit-item-name-${item.id}`}
                    ariaLabel={`${t.dailyEntry.itemNameLabel} — ${t.dailyEntry.mealLabel(position)}`}
                    placeholder={t.dailyEntry.itemNamePlaceholder}
                    value={item.name}
                    onChange={(value) =>
                      onEditItemFieldChange(item.id, 'name', value)
                    }
                    onSelectItem={(mealItem) =>
                      onEditItemSelectMealItem(item.id, mealItem)
                    }
                    onSubmit={onSaveEdit}
                    suggestions={mealItems}
                    className="h-7"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t.dailyEntry.deleteItemLabel}
                    onClick={() => onRemoveEditItem(item.id)}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">
                      {t.dailyEntry.addCaloriesLabel}
                    </span>
                    <Input
                      type="text"
                      inputMode="decimal"
                      aria-label={`${t.dailyEntry.addCaloriesLabel} — ${item.name || t.dailyEntry.mealLabel(position)}`}
                      value={item.amount}
                      onChange={(e) =>
                        onEditItemFieldChange(item.id, 'amount', e.target.value)
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          onSaveEdit()
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
                      aria-label={`${t.dailyEntry.proteinLabel} — ${item.name || t.dailyEntry.mealLabel(position)}`}
                      value={item.protein}
                      onChange={(e) =>
                        onEditItemFieldChange(
                          item.id,
                          'protein',
                          e.target.value,
                        )
                      }
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
                      aria-label={`${t.dailyEntry.fatLabel} — ${item.name || t.dailyEntry.mealLabel(position)}`}
                      value={item.fat}
                      onChange={(e) =>
                        onEditItemFieldChange(item.id, 'fat', e.target.value)
                      }
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
                      aria-label={`${t.dailyEntry.carbsLabel} — ${item.name || t.dailyEntry.mealLabel(position)}`}
                      value={item.carbs}
                      onChange={(e) =>
                        onEditItemFieldChange(item.id, 'carbs', e.target.value)
                      }
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
                      {t.dailyEntry.itemAmountGLabel}
                    </span>
                    <Input
                      type="text"
                      inputMode="decimal"
                      aria-label={`${t.dailyEntry.itemAmountGLabel} — ${item.name || t.dailyEntry.mealLabel(position)}`}
                      value={item.amountG}
                      onChange={(e) =>
                        onEditItemFieldChange(
                          item.id,
                          'amountG',
                          e.target.value,
                        )
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          onSaveEdit()
                        }
                      }}
                      className="h-7 w-14"
                    />
                  </div>
                </div>
                {itemTotalPreview && (
                  <p className="text-xs text-muted-foreground">
                    {t.dailyEntry.computedTotalPrefix} {itemTotalPreview}
                  </p>
                )}
              </li>
            )
          })}
        </ul>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={onAddEditItem}
        >
          {t.dailyEntry.addItemButton}
        </Button>

        <div className="flex flex-wrap items-end gap-2">
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
          <EmotionPicker
            value={editEmotion}
            onChange={onEditEmotionChange}
            options={MEAL_EMOTIONS}
            labelFor={t.dailyEntry.mealEmotionLabel}
            contextLabel={t.dailyEntry.mealLabel(position)}
          />
        </div>
        <Input
          type="text"
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
          className="h-7"
        />
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
          {formatNumber(calorieEntryKcal(entry), locale, 0)}{' '}
          {t.dailyEntry.kcalUnit}
          {entry.timeEaten && (
            <span className="text-muted-foreground">· {entry.timeEaten}</span>
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
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t.dailyEntry.editMealLabel(position)}
            onClick={onStartEdit}
          >
            <Pencil aria-hidden="true" />
          </Button>
          {/* Delete directly from the view row (#97) — previously only
           * reachable after opening edit mode first, unlike History's
           * EntryRow which already shows Pencil + Trash2 side by side.
           * Reuses the same two-step confirm flow (isConfirmingDelete). */}
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
      </div>
      {entry.note && (
        <p className="text-xs text-muted-foreground">{entry.note}</p>
      )}
      {macrosSummary && (
        <p className="text-xs text-muted-foreground">{macrosSummary}</p>
      )}
      {/* Item sub-list (#81) — a group's individual dishes, shown
       * underneath its own header/note/macro-total lines above. */}
      <ul className="flex flex-col gap-0.5 pl-4">
        {entry.items.map((item) => {
          const itemMacros = macrosSummaryTextCompact(
            item.proteinG,
            item.fatG,
            item.carbsG,
            locale,
            t,
          )
          return (
            <li key={item.id} className="text-xs text-muted-foreground">
              {item.name && `${item.name} — `}
              {formatNumber(item.amountKcal, locale, 0)} {t.dailyEntry.kcalUnit}
              {itemMacros && ` · ${itemMacros}`}
            </li>
          )
        })}
      </ul>
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
  // These four describe the group's first (and, via the bottom Add row,
  // only) item — #81's flexible-grouping decision means additional items
  // only get added to a group by opening it for edit afterward, not from
  // this row, which always starts a brand-new meal group.
  const [addAmount, setAddAmount] = useState('')
  const [addProtein, setAddProtein] = useState('')
  const [addFat, setAddFat] = useState('')
  const [addCarbs, setAddCarbs] = useState('')
  const [addAmountG, setAddAmountG] = useState('100')
  const [addItemName, setAddItemName] = useState('')
  // Group-level fields (#81) — note/mood/time-eaten belong to the meal as a
  // whole, not to any one item within it.
  const [addGroupNote, setAddGroupNote] = useState('')
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
  const [isEditingSteps, setIsEditingSteps] = useState(
    alwaysEditable || initialValues.steps === undefined,
  )
  // Quantity-based entry against the static food list (#62) — an alternative
  // to manual kcal/macro entry, not a replacement for it.
  const [isFoodPickerOpen, setIsFoodPickerOpen] = useState(false)
  const [editingMealId, setEditingMealId] = useState<string | null>(null)
  // One draft per item in the group being edited (#81) — see EditItemDraft.
  const [editItems, setEditItems] = useState<EditItemDraft[]>([])
  const [editGroupTime, setEditGroupTime] = useState('')
  const [editGroupNote, setEditGroupNote] = useState('')
  const [editGroupEmotion, setEditGroupEmotion] = useState<
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

  // Starts a brand-new meal group with one item (#81) — the bottom Add row
  // always creates a new group; adding another item to an *existing* group
  // happens by opening it for edit (see the edit-item handlers below).
  function addMeal() {
    const kcal100 = parseNumberInput(addAmount)
    if (!kcal100 || kcal100 <= 0) return
    const scaled = scaleFromPer100g(
      kcal100,
      parseOptionalMacro(addProtein),
      parseOptionalMacro(addFat),
      parseOptionalMacro(addCarbs),
      addAmountG,
    )
    setCalorieEntries([
      ...calorieEntries,
      {
        id: crypto.randomUUID(),
        items: [
          {
            id: crypto.randomUUID(),
            name: addItemName.trim() || undefined,
            ...scaled,
          },
        ],
        note: addGroupNote.trim() || undefined,
        emotion: addEmotion,
        timeEaten: addTime || undefined,
        createdAt: new Date().toISOString(),
      },
    ])
    if (addItemName.trim()) {
      touchMealItem(addItemName, scaled)
    }
    setAddAmount('')
    setAddAmountG('100')
    setAddProtein('')
    setAddFat('')
    setAddCarbs('')
    setAddItemName('')
    setAddGroupNote('')
    setAddEmotion(undefined)
    setAddTime('')
  }

  // Restores a previously-logged item's kcal/macros when its name is picked
  // from the add row's autocomplete (#94) — before this, only the name
  // field itself got filled in, even though MealItem already stores exactly
  // these numbers from the last time this name was saved (#86). Nothing to
  // restore for a bare name with no recorded nutrition yet.
  function selectAddItemMealItem(item: MealItem) {
    if (item.lastAmountKcal === undefined) return
    const rates = ratesFromAbsolute(
      item.lastAmountKcal,
      item.lastProteinG,
      item.lastFatG,
      item.lastCarbsG,
      item.lastAmountG,
    )
    setAddAmount(String(rates.kcal100))
    setAddProtein(
      rates.protein100 === undefined ? '' : String(rates.protein100),
    )
    setAddFat(rates.fat100 === undefined ? '' : String(rates.fat100))
    setAddCarbs(rates.carbs100 === undefined ? '' : String(rates.carbs100))
    setAddAmountG(String(rates.quantity))
  }

  // Quantity-based entry against the static food list (#62) — the dialog
  // already computed kcal/macros scaled by quantity; this just adds the
  // result as a new single-item meal group (#81), same as the manual Add
  // row above.
  function addFoodEntry(values: {
    amountKcal: number
    proteinG: number
    fatG: number
    carbsG: number
    note: string
    amountG?: number
  }) {
    setCalorieEntries([
      ...calorieEntries,
      {
        id: crypto.randomUUID(),
        items: [
          {
            id: crypto.randomUUID(),
            name: values.note,
            amountKcal: values.amountKcal,
            proteinG: values.proteinG,
            fatG: values.fatG,
            carbsG: values.carbsG,
            amountG: values.amountG,
          },
        ],
        timeEaten: currentTimeHHMM(),
        createdAt: new Date().toISOString(),
      },
    ])
  }

  function startEditMeal(entry: CalorieEntry) {
    setEditingMealId(entry.id)
    setEditItems(entry.items.map(itemDraftFrom))
    setEditGroupTime(entry.timeEaten ?? '')
    setEditGroupNote(entry.note ?? '')
    setEditGroupEmotion(entry.emotion)
  }

  function updateEditItemField(
    id: string,
    field: 'name' | 'amount' | 'protein' | 'fat' | 'carbs' | 'amountG',
    value: string,
  ) {
    setEditItems((items) =>
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    )
  }

  // Same restore as selectAddItemMealItem, for an item row inside an
  // already-existing meal's edit mode (#94).
  function selectEditItemMealItem(id: string, item: MealItem) {
    if (item.lastAmountKcal === undefined) return
    const rates = ratesFromAbsolute(
      item.lastAmountKcal,
      item.lastProteinG,
      item.lastFatG,
      item.lastCarbsG,
      item.lastAmountG,
    )
    setEditItems((items) =>
      items.map((draft) =>
        draft.id === id
          ? {
              ...draft,
              amount: String(rates.kcal100),
              protein:
                rates.protein100 === undefined ? '' : String(rates.protein100),
              fat: rates.fat100 === undefined ? '' : String(rates.fat100),
              carbs: rates.carbs100 === undefined ? '' : String(rates.carbs100),
              amountG: String(rates.quantity),
            }
          : draft,
      ),
    )
  }

  function addEditItem() {
    setEditItems((items) => [...items, blankItemDraft()])
  }

  function removeEditItem(id: string) {
    setEditItems((items) => items.filter((item) => item.id !== id))
  }

  // Drafts with no valid kcal are dropped silently (mirrors the add flow's
  // own "amount required" guard) rather than blocking Save on them — an
  // accidentally-blank row added via "+ Add item" and never filled in
  // shouldn't hold the whole edit hostage. If every item drops out, the
  // group itself is removed (#81's "last item removed = meal removed").
  function saveEditMeal() {
    const items: CalorieItem[] = editItems.flatMap((draft) => {
      const kcal100 = parseNumberInput(draft.amount)
      if (!kcal100 || kcal100 <= 0) return []
      const scaled = scaleFromPer100g(
        kcal100,
        parseOptionalMacro(draft.protein),
        parseOptionalMacro(draft.fat),
        parseOptionalMacro(draft.carbs),
        draft.amountG,
      )
      return [
        {
          id: draft.id,
          name: draft.name.trim() || undefined,
          ...scaled,
        },
      ]
    })
    if (items.length === 0) {
      setCalorieEntries(
        calorieEntries.filter((entry) => entry.id !== editingMealId),
      )
      setEditingMealId(null)
      return
    }
    setCalorieEntries(
      calorieEntries.map((entry) =>
        entry.id === editingMealId
          ? {
              ...entry,
              items,
              note: editGroupNote.trim() || undefined,
              emotion: editGroupEmotion,
              timeEaten: editGroupTime || undefined,
            }
          : entry,
      ),
    )
    for (const item of items) {
      if (item.name) {
        touchMealItem(item.name, {
          amountKcal: item.amountKcal,
          proteinG: item.proteinG,
          fatG: item.fatG,
          carbsG: item.carbsG,
          amountG: item.amountG,
        })
      }
    }
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

  // Live preview of the add row's computed total (#98) — recomputed on
  // every keystroke from the exact same math addMeal() will run, so the
  // per-100g × quantity multiplication is visible before Add is pressed.
  // null (nothing rendered) until a valid kcal rate is typed.
  const addKcal100Preview = parseNumberInput(addAmount)
  const addTotalPreview =
    addKcal100Preview && addKcal100Preview > 0
      ? formatComputedTotal(
          scaleFromPer100g(
            addKcal100Preview,
            parseOptionalMacro(addProtein),
            parseOptionalMacro(addFat),
            parseOptionalMacro(addCarbs),
            addAmountG,
          ),
          locale,
          t,
        )
      : null

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
          <span className="text-sm font-medium">{t.dailyEntry.sleepLabel}</span>
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
          <span className="text-sm font-medium">{t.dailyEntry.stepsLabel}</span>
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
          <span className="text-sm font-medium">{t.dailyEntry.stepsLabel}</span>
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
                    mealItems={mealItems}
                    isEditing={editingMealId === entry.id}
                    isConfirmingDelete={confirmDeleteMealId === entry.id}
                    editItems={editItems}
                    editTime={editGroupTime}
                    editNote={editGroupNote}
                    editEmotion={editGroupEmotion}
                    onEditItemFieldChange={updateEditItemField}
                    onEditItemSelectMealItem={selectEditItemMealItem}
                    onAddEditItem={addEditItem}
                    onRemoveEditItem={removeEditItem}
                    onEditTimeChange={setEditGroupTime}
                    onEditNoteChange={setEditGroupNote}
                    onEditEmotionChange={setEditGroupEmotion}
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

        <div
          className={cn(
            'flex flex-col gap-1.5',
            // Divider + heading (#95) — without one, this row read as a
            // continuation of the last meal group above it rather than the
            // start of a new one, since both share the same visual weight.
            // mealLabel(n) is the same numbering already shown on existing
            // groups, so this row previews the number the new meal will get.
            calorieEntries.length > 0 && 'border-t border-border pt-2',
          )}
        >
          <span className="text-xs font-medium text-muted-foreground">
            {t.dailyEntry.mealLabel(calorieEntries.length + 1)}
          </span>
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">
                {t.dailyEntry.addCaloriesLabel}
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
                    addMeal()
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
                    addMeal()
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
                    addMeal()
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
                    addMeal()
                  }
                }}
                className="h-7 w-14"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">
                {t.dailyEntry.itemAmountGLabel}
              </span>
              <Input
                type="text"
                inputMode="decimal"
                aria-label={t.dailyEntry.itemAmountGLabel}
                value={addAmountG}
                onChange={(e) => setAddAmountG(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addMeal()
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
          </div>
          {addTotalPreview && (
            <p className="text-xs text-muted-foreground">
              {t.dailyEntry.computedTotalPrefix} {addTotalPreview}
            </p>
          )}
          <MealNoteAutocomplete
            listInputId="add-item-name"
            ariaLabel={t.dailyEntry.itemNameLabel}
            placeholder={t.dailyEntry.itemNamePlaceholder}
            value={addItemName}
            onChange={setAddItemName}
            onSelectItem={selectAddItemMealItem}
            onSubmit={addMeal}
            suggestions={mealItems}
            className="h-7 w-full"
          />
          <div className="flex items-center gap-2">
            <Input
              type="text"
              aria-label={t.dailyEntry.mealNoteLabel}
              placeholder={t.dailyEntry.mealNotePlaceholder}
              value={addGroupNote}
              onChange={(e) => setAddGroupNote(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addMeal()
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
          {/* Add sits after the note/mood row, not before (#79) — it was
           * previously part of the fields row above, so users who typed a
           * note last didn't realize it still applied to a button they'd
           * already scrolled past. Full width so it reads as the row's
           * single clear final action; + Food moved down alongside it for
           * the same reason, rather than staying stranded up top. */}
          <Button
            type="button"
            variant="default"
            size="sm"
            className="w-full"
            onClick={addMeal}
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
          {/* Lazily mounted (#78) — the food list grew to 300+ items, and
           * rendering it unconditionally meant every DailyEntryForm render
           * paid that cost even with the dialog closed. Only mounting it
           * while open keeps the closed (overwhelmingly common) case cheap. */}
          {isFoodPickerOpen && (
            <FoodPickerDialog
              open={isFoodPickerOpen}
              onOpenChange={setIsFoodPickerOpen}
              onAdd={addFoodEntry}
              mealItems={mealItems}
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
