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
import { Check, Clock, GripVertical, Pencil, Trash2, X } from 'lucide-react'
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
  totalFromPortion,
} from '@/shared/lib/macroScaling'
import { defaultMealLabel, effectiveMealLabel } from '@/shared/lib/mealLabel'
import { parseNumberInput } from '@/shared/lib/parseNumberInput'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { InfoTooltip } from '@/shared/ui/info-tooltip'
import { Input } from '@/shared/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/toggle-group'
import {
  useDigestionTrackingStore,
  useMealItemStore,
  useMealLabelPresetStore,
} from '@/stores'
import { entryToFormValues, formValuesToEntry } from './dailyEntryFormMapping'
import { EmotionPicker } from './EmotionPicker'
import { FoodPickerDialog } from './FoodPickerDialog'
import { MealItemEditorSheet } from './MealItemEditorSheet'
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
  // Per 100g / Per portion entry mode (#111) — always starts as 'per100g'
  // when opening an existing item for edit, even if it was originally
  // logged in "per portion" mode: the back-calculated rate (via
  // ratesFromAbsolute below) is mathematically identical to what was
  // typed when no portion weight was recorded (quantity defaults to 100),
  // so there's no information lost by not persisting the original mode.
  macroMode: 'per100g' | 'perPortion'
  // This dish's own reaction (#129) — see CalorieItem.emotion.
  emotion: MealEmotion | undefined
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
    macroMode: 'per100g',
    emotion: item.emotion,
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
    macroMode: 'per100g',
    emotion: undefined,
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
  editLabel: string
  editTime: string
  editNote: string
  onEditItemFieldChange: (
    id: string,
    field: 'name' | 'amount' | 'protein' | 'fat' | 'carbs' | 'amountG',
    value: string,
  ) => void
  onEditItemSelectMealItem: (id: string, item: MealItem) => void
  onEditItemModeChange: (id: string, mode: 'per100g' | 'perPortion') => void
  // Per-dish reaction (#129) — moved from meal-group level.
  onEditItemEmotionChange: (id: string, emotion: MealEmotion | undefined) => void
  /** Returns the new draft's id (#122) so the caller can open its editor
   * sheet immediately. */
  onAddEditItem: () => string
  onRemoveEditItem: (id: string) => void
  onEditLabelChange: (value: string) => void
  onEditTimeChange: (value: string) => void
  onEditNoteChange: (value: string) => void
  onStartEdit: () => void
  onSaveEdit: () => void
  onRequestDelete: () => void
  onConfirmDelete: () => void
  onCancelDelete: () => void
  /** Which editItems draft (by id) has its full-screen editor sheet open
   * (#122) — null when none. */
  openEditItemId: string | null
  onOpenEditItem: (id: string | null) => void
  /** "Find food" for an item within this meal (#124) — pushes the picked
   * food straight into the shared editItems staging array, same as
   * onAddEditItem's manual blank row. */
  onAddFood: (values: {
    amountKcal: number
    proteinG: number
    fatG: number
    carbsG: number
    note: string
    amountG?: number
  }) => void
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
  editLabel,
  editTime,
  editNote,
  onEditItemFieldChange,
  onEditItemSelectMealItem,
  onEditItemModeChange,
  onEditItemEmotionChange,
  onAddEditItem,
  onRemoveEditItem,
  onEditLabelChange,
  onEditTimeChange,
  onEditNoteChange,
  onStartEdit,
  onSaveEdit,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
  openEditItemId,
  onOpenEditItem,
  onAddFood,
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
  const mealLabelPresets = useMealLabelPresetStore((state) => state.presets)
  // Own local dialog state (#124), not lifted to DailyEntryForm — each
  // MealListItem's "Find food" is independent of every other one and of
  // the bottom add row's own isFoodPickerOpen.
  const [isFoodPickerOpen, setIsFoodPickerOpen] = useState(false)
  const macrosSummary = macrosSummaryText(
    calorieEntryProtein(entry),
    calorieEntryFat(entry),
    calorieEntryCarbs(entry),
    locale,
    t,
  )
  // Which editItems draft (if any) the full-screen item editor is currently
  // open for (#122) — computed unconditionally since it's cheap and only
  // actually rendered inside the isEditing branch below.
  const openDraft = editItems.find((item) => item.id === openEditItemId) ?? null

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
        <div className="flex items-center gap-3">
          {/* Custom meal name (#110) — free text, defaulting to the
           * positional default name (#141: Breakfast/Lunch/Dinner/Snack,
           * "Meal N" from the 5th meal on) as the placeholder when left
           * blank. Quick-pick chips below come from useMealLabelPresetStore
           * (managed in Settings), a shortcut alongside free text, not a
           * constraint. The aria-label's own disambiguation suffix stays
           * the plain positional "Meal N" — purely an internal a11y anchor
           * to tell same-named controls on different meals apart, not
           * user-facing text, so it doesn't need to track the new default. */}
          <Input
            type="text"
            aria-label={`${t.dailyEntry.mealLabelFieldLabel} — ${t.dailyEntry.mealLabel(position)}`}
            placeholder={defaultMealLabel(t, position)}
            value={editLabel}
            onChange={(e) => onEditLabelChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                onSaveEdit()
              }
            }}
            className="h-7 flex-1"
          />
          {/* #146: was a barely-visible ghost icon that users didn't
           * register as a required save step — outline gives it a visible
           * border/button shape instead, same fix direction as the rest of
           * this row staying icon-only (Delete is secondary/destructive,
           * appropriately quieter). */}
          <Button
            type="button"
            variant="outline"
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
        {mealLabelPresets.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {mealLabelPresets.map((preset) => (
              <Button
                key={preset}
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => onEditLabelChange(preset)}
              >
                {preset}
              </Button>
            ))}
          </div>
        )}

        {/* One compact row per item in this meal group (#81, #122) — a
         * one-line name/total summary with edit-pencil + delete, rather
         * than always-expanded fields. The pencil opens the full-screen
         * MealItemEditorSheet below. Removing every item and saving
         * deletes the whole group, same end result as the group Delete
         * button above. */}
        <ul className="flex flex-col gap-2">
          {editItems.map((item) => {
            const itemAmountNum = parseNumberInput(item.amount)
            const itemTotalPreview =
              itemAmountNum && itemAmountNum > 0
                ? formatComputedTotal(
                    item.macroMode === 'per100g'
                      ? scaleFromPer100g(
                          itemAmountNum,
                          parseOptionalMacro(item.protein),
                          parseOptionalMacro(item.fat),
                          parseOptionalMacro(item.carbs),
                          item.amountG,
                        )
                      : totalFromPortion(
                          itemAmountNum,
                          parseOptionalMacro(item.protein),
                          parseOptionalMacro(item.fat),
                          parseOptionalMacro(item.carbs),
                          item.amountG,
                        ),
                    locale,
                    t,
                  )
                : null
            // This dish's own reaction (#129) — shown here too, not just in
            // the full-screen editor, so it's visible without opening it.
            const itemEmotionOption = MEAL_EMOTIONS.find(
              (e) => e.value === item.emotion,
            )
            return (
              <li
                key={item.id}
                className="flex items-center gap-3 rounded-md bg-card px-2 py-1"
              >
                <span className="flex-1 truncate text-sm">
                  {item.name || t.dailyEntry.itemNamePlaceholder}
                  {itemTotalPreview && (
                    <span className="text-muted-foreground">
                      {' '}
                      — {itemTotalPreview}
                    </span>
                  )}
                  {itemEmotionOption && (
                    <>
                      {' '}
                      <span aria-hidden="true" className="text-sm leading-none">
                        {itemEmotionOption.emoji}
                      </span>
                      <span className="sr-only">
                        {t.dailyEntry.mealEmotionLabel(item.emotion!)}
                      </span>
                    </>
                  )}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t.dailyEntry.editItemLabel}
                  onClick={() => onOpenEditItem(item.id)}
                >
                  <Pencil aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t.dailyEntry.deleteItemLabel}
                  onClick={() => onRemoveEditItem(item.id)}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </li>
            )
          })}
        </ul>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-start"
          // Composed with the meal label (#122) so this doesn't collide
          // with the add-row's own same-text trigger when both are visible
          // at once (editing an existing meal while nothing new is
          // staged yet).
          aria-label={`${t.dailyEntry.addItemButton} — ${t.dailyEntry.mealLabel(position)}`}
          onClick={() => onOpenEditItem(onAddEditItem())}
        >
          {t.dailyEntry.addItemButton}
        </Button>
        {/* "Find food" for an item within this existing meal (#124) —
         * FoodPickerDialog was previously only reachable from the bottom
         * add row, leaving no way to search the food list while editing an
         * already-existing meal. Same "or" framing as the add row's own. */}
        <p className="text-center text-xs text-muted-foreground">
          {t.dailyEntry.orDivider}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-start"
          aria-label={`${t.dailyEntry.addFoodButton} — ${t.dailyEntry.mealLabel(position)}`}
          onClick={() => setIsFoodPickerOpen(true)}
        >
          {t.dailyEntry.addFoodButton}
        </Button>
        {isFoodPickerOpen && (
          <FoodPickerDialog
            open={isFoodPickerOpen}
            onOpenChange={setIsFoodPickerOpen}
            onAdd={onAddFood}
            mealItems={mealItems}
          />
        )}
        {openDraft && (
          <MealItemEditorSheet
            open
            onOpenChange={(open) => !open && onOpenEditItem(null)}
            title={t.dailyEntry.editItemSheetTitle}
            name={openDraft.name}
            onNameChange={(value) =>
              onEditItemFieldChange(openDraft.id, 'name', value)
            }
            amount={openDraft.amount}
            onAmountChange={(value) =>
              onEditItemFieldChange(openDraft.id, 'amount', value)
            }
            protein={openDraft.protein}
            onProteinChange={(value) =>
              onEditItemFieldChange(openDraft.id, 'protein', value)
            }
            fat={openDraft.fat}
            onFatChange={(value) =>
              onEditItemFieldChange(openDraft.id, 'fat', value)
            }
            carbs={openDraft.carbs}
            onCarbsChange={(value) =>
              onEditItemFieldChange(openDraft.id, 'carbs', value)
            }
            amountG={openDraft.amountG}
            onAmountGChange={(value) =>
              onEditItemFieldChange(openDraft.id, 'amountG', value)
            }
            macroMode={openDraft.macroMode}
            onMacroModeChange={(mode) =>
              onEditItemModeChange(openDraft.id, mode)
            }
            mealItems={mealItems}
            onSelectMealItem={(mealItem) =>
              onEditItemSelectMealItem(openDraft.id, mealItem)
            }
            emotion={openDraft.emotion}
            onEmotionChange={(emotion) =>
              onEditItemEmotionChange(openDraft.id, emotion)
            }
            onSave={() => onOpenEditItem(null)}
          />
        )}

        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">
            {t.dailyEntry.timeEatenLabel}
          </span>
          <div className="flex items-center gap-3">
            <Input
              type="time"
              aria-label={`${t.dailyEntry.timeEatenLabel} — ${t.dailyEntry.mealLabel(position)}`}
              value={editTime}
              onChange={(e) => onEditTimeChange(e.target.value)}
              className="h-12 w-24"
            />
            {/* App-level clear button (#117), same as the add row's. */}
            {editTime && (
              <Button
                type="button"
                variant="ghost"
                size="icon-xl"
                aria-label={`${t.dailyEntry.clearTimeLabel} — ${t.dailyEntry.mealLabel(position)}`}
                onClick={() => onEditTimeChange('')}
              >
                <X aria-hidden="true" className="size-3.5" />
              </Button>
            )}
          </div>
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
          className="h-12"
        />
      </li>
    )
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex flex-col gap-1.5 px-1 py-1',
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
          {effectiveMealLabel(t, position, entry.label)} —{' '}
          {formatNumber(calorieEntryKcal(entry), locale, 0)}{' '}
          {t.dailyEntry.kcalUnit}
          {entry.timeEaten && (
            <span className="text-muted-foreground">· {entry.timeEaten}</span>
          )}
        </span>
        <div className="flex items-center gap-3">
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
      <ul className="flex flex-col gap-1 pl-4">
        {entry.items.map((item) => {
          const itemMacros = macrosSummaryTextCompact(
            item.proteinG,
            item.fatG,
            item.carbsG,
            locale,
            t,
          )
          // This dish's own reaction (#129) — no longer one shared reaction
          // for the whole meal.
          const itemEmotionOption = MEAL_EMOTIONS.find(
            (e) => e.value === item.emotion,
          )
          return (
            <li key={item.id} className="text-xs text-muted-foreground">
              {item.name && `${item.name} — `}
              {formatNumber(item.amountKcal, locale, 0)} {t.dailyEntry.kcalUnit}
              {itemMacros && ` · ${itemMacros}`}
              {itemEmotionOption && (
                <>
                  {' '}
                  <span aria-hidden="true" className="text-sm leading-none">
                    {itemEmotionOption.emoji}
                  </span>
                  <span className="sr-only">
                    {t.dailyEntry.mealEmotionLabel(item.emotion!)}
                  </span>
                </>
              )}
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
  // Per 100g / Per portion entry mode (#111) — 'per100g' is the default,
  // unchanged behavior. Switching modes converts the currently-typed
  // numbers (via handleAddMacroModeChange below) rather than leaving them
  // to be silently reinterpreted with a different meaning.
  const [addMacroMode, setAddMacroMode] = useState<'per100g' | 'perPortion'>(
    'per100g',
  )
  const [addItemName, setAddItemName] = useState('')
  // This item's own reaction (#129) — moved from the meal group; grouped
  // with the other per-item draft fields above, not the group-level ones
  // below.
  const [addItemEmotion, setAddItemEmotion] = useState<
    MealEmotion | undefined
  >(undefined)
  // Group-level fields (#81) — note/time-eaten belong to the meal as a
  // whole, not to any one item within it.
  const [addGroupNote, setAddGroupNote] = useState('')
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
  // Full-screen item editor sheet (#122) — the add row's own instance,
  // opened by its "+ Add item" trigger. Closing it (via Save or the X)
  // never clears the underlying add-* state, so a half-filled draft
  // survives reopening.
  const [isAddItemSheetOpen, setIsAddItemSheetOpen] = useState(false)
  const [editingMealId, setEditingMealId] = useState<string | null>(null)
  // One draft per item in the group being edited (#81) — see EditItemDraft.
  const [editItems, setEditItems] = useState<EditItemDraft[]>([])
  // Which editItems draft (by id) has its full-screen editor sheet open
  // (#122) — null when none. Reset on save/delete so it can't dangle
  // pointing at a draft that no longer exists.
  const [openEditItemId, setOpenEditItemId] = useState<string | null>(null)
  const [editGroupLabel, setEditGroupLabel] = useState('')
  const [editGroupTime, setEditGroupTime] = useState('')
  const [editGroupNote, setEditGroupNote] = useState('')
  const [confirmDeleteMealId, setConfirmDeleteMealId] = useState<string | null>(
    null,
  )
  const dragSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  // Opt-in digestion tracking's on/off toggle (Settings) — the toggle
  // itself only renders on this screen when enabled, same gate DayDetail
  // already uses for its own copy of this control.
  const digestionTrackingEnabled = useDigestionTrackingStore(
    (state) => state.enabled,
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
  const hadConstipation = watch('hadConstipation')
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

  // Saves immediately on tap, same as every other independent field here
  // (#31) — no separate confirm step, since a toggle whose own state
  // already shows what's about to happen doesn't need one.
  function setHadConstipation(value: boolean) {
    setValue('hadConstipation', value, { shouldDirty: true })
    persist({ ...getValues(), hadConstipation: value })
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
  // Switching entry mode (#111) converts the currently-typed numbers so
  // nothing is silently reinterpreted with a different meaning — e.g. a
  // per-100g rate of 300 with a 50g quantity becomes an absolute total of
  // 150 when switching to "per portion", not a total of 300.
  function handleAddMacroModeChange(newMode: 'per100g' | 'perPortion') {
    if (newMode === addMacroMode) return
    const amountNum = parseNumberInput(addAmount)
    if (amountNum && amountNum > 0) {
      if (newMode === 'perPortion') {
        const scaled = scaleFromPer100g(
          amountNum,
          parseOptionalMacro(addProtein),
          parseOptionalMacro(addFat),
          parseOptionalMacro(addCarbs),
          addAmountG,
        )
        setAddAmount(String(scaled.amountKcal))
        setAddProtein(
          scaled.proteinG === undefined ? '' : String(scaled.proteinG),
        )
        setAddFat(scaled.fatG === undefined ? '' : String(scaled.fatG))
        setAddCarbs(scaled.carbsG === undefined ? '' : String(scaled.carbsG))
      } else {
        const rates = ratesFromAbsolute(
          amountNum,
          parseOptionalMacro(addProtein),
          parseOptionalMacro(addFat),
          parseOptionalMacro(addCarbs),
          parseOptionalMacro(addAmountG),
        )
        setAddAmount(String(rates.kcal100))
        setAddProtein(
          rates.protein100 === undefined ? '' : String(rates.protein100),
        )
        setAddFat(rates.fat100 === undefined ? '' : String(rates.fat100))
        setAddCarbs(rates.carbs100 === undefined ? '' : String(rates.carbs100))
        setAddAmountG(String(rates.quantity))
      }
    }
    setAddMacroMode(newMode)
  }

  function addMeal() {
    const amountNum = parseNumberInput(addAmount)
    if (!amountNum || amountNum <= 0) return
    const scaled =
      addMacroMode === 'per100g'
        ? scaleFromPer100g(
            amountNum,
            parseOptionalMacro(addProtein),
            parseOptionalMacro(addFat),
            parseOptionalMacro(addCarbs),
            addAmountG,
          )
        : totalFromPortion(
            amountNum,
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
            emotion: addItemEmotion,
          },
        ],
        note: addGroupNote.trim() || undefined,
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
    setAddMacroMode('per100g')
    setAddItemName('')
    setAddItemEmotion(undefined)
    setAddGroupNote('')
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
    emotion?: MealEmotion
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
            emotion: values.emotion,
          },
        ],
        timeEaten: currentTimeHHMM(),
        createdAt: new Date().toISOString(),
      },
    ])
  }

  // "Find food" for an item within an already-existing meal being edited —
  // FoodPickerDialog was previously only wired to the bottom add row
  // (addFoodEntry above), leaving no way to search the food list while
  // editing an existing meal, only manual entry via "+ Add item". Converts
  // the picked food's absolute totals to a per-100g rate + quantity via
  // ratesFromAbsolute, same as selectEditItemMealItem's "restore a
  // suggestion" path — picking a food always lands in per-100g mode.
  function addFoodToEditItems(values: {
    amountKcal: number
    proteinG: number
    fatG: number
    carbsG: number
    note: string
    amountG?: number
    emotion?: MealEmotion
  }) {
    const rates = ratesFromAbsolute(
      values.amountKcal,
      values.proteinG,
      values.fatG,
      values.carbsG,
      values.amountG,
    )
    setEditItems((items) => [
      ...items,
      {
        id: crypto.randomUUID(),
        name: values.note,
        amount: String(rates.kcal100),
        protein: rates.protein100 === undefined ? '' : String(rates.protein100),
        fat: rates.fat100 === undefined ? '' : String(rates.fat100),
        carbs: rates.carbs100 === undefined ? '' : String(rates.carbs100),
        amountG: String(rates.quantity),
        macroMode: 'per100g',
        emotion: values.emotion,
      },
    ])
  }

  function startEditMeal(entry: CalorieEntry) {
    setEditingMealId(entry.id)
    setEditItems(entry.items.map(itemDraftFrom))
    setEditGroupLabel(entry.label ?? '')
    setEditGroupTime(entry.timeEaten ?? '')
    setEditGroupNote(entry.note ?? '')
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

  // Separate from updateEditItemField above since emotion isn't a text
  // field (#129).
  function updateEditItemEmotion(id: string, emotion: MealEmotion | undefined) {
    setEditItems((items) =>
      items.map((item) => (item.id === id ? { ...item, emotion } : item)),
    )
  }

  // Same conversion-on-switch reasoning as the add row's
  // handleAddMacroModeChange (#111) — updates whichever item-edit row's
  // draft is being toggled, converting its currently-typed numbers so
  // nothing is silently reinterpreted.
  function updateEditItemMode(id: string, newMode: 'per100g' | 'perPortion') {
    setEditItems((items) =>
      items.map((draft) => {
        if (draft.id !== id || draft.macroMode === newMode) return draft
        const amountNum = parseNumberInput(draft.amount)
        if (!amountNum || amountNum <= 0) {
          return { ...draft, macroMode: newMode }
        }
        if (newMode === 'perPortion') {
          const scaled = scaleFromPer100g(
            amountNum,
            parseOptionalMacro(draft.protein),
            parseOptionalMacro(draft.fat),
            parseOptionalMacro(draft.carbs),
            draft.amountG,
          )
          return {
            ...draft,
            amount: String(scaled.amountKcal),
            protein:
              scaled.proteinG === undefined ? '' : String(scaled.proteinG),
            fat: scaled.fatG === undefined ? '' : String(scaled.fatG),
            carbs: scaled.carbsG === undefined ? '' : String(scaled.carbsG),
            macroMode: newMode,
          }
        }
        const rates = ratesFromAbsolute(
          amountNum,
          parseOptionalMacro(draft.protein),
          parseOptionalMacro(draft.fat),
          parseOptionalMacro(draft.carbs),
          parseOptionalMacro(draft.amountG),
        )
        return {
          ...draft,
          amount: String(rates.kcal100),
          protein:
            rates.protein100 === undefined ? '' : String(rates.protein100),
          fat: rates.fat100 === undefined ? '' : String(rates.fat100),
          carbs: rates.carbs100 === undefined ? '' : String(rates.carbs100),
          amountG: String(rates.quantity),
          macroMode: newMode,
        }
      }),
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
              // Restoring a suggestion always fills in per-100g rates
              // (MealItem.lastAmountKcal etc. don't carry a mode of their
              // own), so force the row back to that mode too — otherwise
              // a row left in "per portion" mode would show a rate as if
              // it were a total.
              macroMode: 'per100g',
            }
          : draft,
      ),
    )
  }

  // Returns the new draft's id (#122) so the caller can immediately open
  // its editor sheet — a freshly-added blank row has nothing worth showing
  // at rest.
  function addEditItem(): string {
    const draft = blankItemDraft()
    setEditItems((items) => [...items, draft])
    return draft.id
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
      const amountNum = parseNumberInput(draft.amount)
      if (!amountNum || amountNum <= 0) return []
      const scaled =
        draft.macroMode === 'per100g'
          ? scaleFromPer100g(
              amountNum,
              parseOptionalMacro(draft.protein),
              parseOptionalMacro(draft.fat),
              parseOptionalMacro(draft.carbs),
              draft.amountG,
            )
          : totalFromPortion(
              amountNum,
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
          emotion: draft.emotion,
        },
      ]
    })
    if (items.length === 0) {
      setCalorieEntries(
        calorieEntries.filter((entry) => entry.id !== editingMealId),
      )
      setEditingMealId(null)
      setOpenEditItemId(null)
      return
    }
    setCalorieEntries(
      calorieEntries.map((entry) =>
        entry.id === editingMealId
          ? {
              ...entry,
              items,
              label: editGroupLabel.trim() || undefined,
              note: editGroupNote.trim() || undefined,
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
    setOpenEditItemId(null)
  }

  function confirmDeleteMeal() {
    setCalorieEntries(
      calorieEntries.filter((entry) => entry.id !== confirmDeleteMealId),
    )
    if (editingMealId === confirmDeleteMealId) {
      setEditingMealId(null)
      setOpenEditItemId(null)
    }
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
  // every keystroke from the exact same math addMeal() will run (#111:
  // mode-aware — per-100g × quantity, or the typed total directly), so
  // it's visible before Add is pressed. null (nothing rendered) until a
  // valid amount is typed. Also backs the Add button's disabled state
  // (#109) — a valid positive number either way, regardless of mode.
  const addAmountPreview = parseNumberInput(addAmount)
  const addTotalPreview =
    addAmountPreview && addAmountPreview > 0
      ? formatComputedTotal(
          addMacroMode === 'per100g'
            ? scaleFromPer100g(
                addAmountPreview,
                parseOptionalMacro(addProtein),
                parseOptionalMacro(addFat),
                parseOptionalMacro(addCarbs),
                addAmountG,
              )
            : totalFromPortion(
                addAmountPreview,
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
          <div className="flex h-12 items-center justify-between rounded-lg bg-muted px-3">
            <span className="text-sm text-foreground">
              {formatExactNumber(weightKg!, locale)} {t.common.kg}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-xl"
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
          <div className="flex items-center gap-3">
            <Input
              type="text"
              inputMode="decimal"
              aria-label={t.dailyEntry.weightLabel}
              aria-invalid={errors.weightKg ? true : undefined}
              className="h-12 flex-1"
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
              size="icon-xl"
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
          <div className="flex h-12 items-center justify-between rounded-lg bg-muted px-3">
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
              size="icon-xl"
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
                  className="h-12 w-12"
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
                  className="h-12 w-12"
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
                  className="h-12 w-12"
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
                  className="h-12 w-12"
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
              size="icon-xl"
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
              <ul className="flex flex-col gap-3">
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
                    editLabel={editGroupLabel}
                    editTime={editGroupTime}
                    editNote={editGroupNote}
                    onEditItemFieldChange={updateEditItemField}
                    onEditItemSelectMealItem={selectEditItemMealItem}
                    onEditItemModeChange={updateEditItemMode}
                    onEditItemEmotionChange={updateEditItemEmotion}
                    onAddEditItem={addEditItem}
                    onRemoveEditItem={removeEditItem}
                    onEditLabelChange={setEditGroupLabel}
                    onEditTimeChange={setEditGroupTime}
                    onEditNoteChange={setEditGroupNote}
                    onStartEdit={() => startEditMeal(entry)}
                    onSaveEdit={saveEditMeal}
                    onRequestDelete={() => setConfirmDeleteMealId(entry.id)}
                    onConfirmDelete={confirmDeleteMeal}
                    onCancelDelete={() => setConfirmDeleteMealId(null)}
                    openEditItemId={openEditItemId}
                    onOpenEditItem={setOpenEditItemId}
                    onAddFood={addFoodToEditItems}
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
            // defaultMealLabel(n) (#141) is the same default name existing
            // unlabeled groups show, so this row previews what the new meal
            // will get: Breakfast/Lunch/Dinner/Snack for the first 4, "Meal
            // N" from the 5th on.
            calorieEntries.length > 0 && 'border-t border-border pt-2',
          )}
        >
          {/* Time moved up onto the heading line (#107) — it isn't a macro
           * the way kcal/protein/fat/carbs are, so keeping it in the fields
           * row diluted the macros' proximity to the item-name input right
           * below them. */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              {defaultMealLabel(t, calorieEntries.length + 1)}
            </span>
            {/* Clock icon (#114) — a bare empty box gave no visual hint this
             * was a time picker, since native <input type="time"> doesn't
             * reliably show a placeholder across browsers. */}
            <div className="flex items-center gap-3 text-muted-foreground">
              <Clock aria-hidden="true" className="size-3.5" />
              <Input
                type="time"
                aria-label={t.dailyEntry.timeEatenLabel}
                value={addTime}
                onChange={(e) => setAddTime(e.target.value)}
                className="h-12 w-24"
              />
              {/* App-level clear button (#117) — the native iOS time
               * picker's own Reset doesn't reliably clear the value back
               * to empty once tapped, so this bypasses it entirely. */}
              {addTime && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xl"
                  aria-label={t.dailyEntry.clearTimeLabel}
                  onClick={() => setAddTime('')}
                >
                  <X aria-hidden="true" className="size-3.5" />
                </Button>
              )}
            </div>
          </div>
          {/* Item fields (name, mode, kcal, macros) moved into a
           * full-screen editor sheet (#122) — this trigger shows a compact
           * preview once something's staged, same as an editItems row. */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-12 justify-start"
            onClick={() => setIsAddItemSheetOpen(true)}
          >
            {addAmountPreview && addAmountPreview > 0 ? (
              <span className="truncate">
                {addItemName || t.dailyEntry.itemNamePlaceholder}
                {addTotalPreview && (
                  <span className="text-muted-foreground">
                    {' '}
                    — {addTotalPreview}
                  </span>
                )}
              </span>
            ) : (
              t.dailyEntry.addItemButton
            )}
          </Button>
          <MealItemEditorSheet
            open={isAddItemSheetOpen}
            onOpenChange={setIsAddItemSheetOpen}
            title={t.dailyEntry.addItemSheetTitle}
            name={addItemName}
            onNameChange={setAddItemName}
            amount={addAmount}
            onAmountChange={setAddAmount}
            protein={addProtein}
            onProteinChange={setAddProtein}
            fat={addFat}
            onFatChange={setAddFat}
            carbs={addCarbs}
            onCarbsChange={setAddCarbs}
            amountG={addAmountG}
            onAmountGChange={setAddAmountG}
            macroMode={addMacroMode}
            onMacroModeChange={handleAddMacroModeChange}
            mealItems={mealItems}
            onSelectMealItem={selectAddItemMealItem}
            emotion={addItemEmotion}
            onEmotionChange={setAddItemEmotion}
            onSave={() => {
              addMeal()
              setIsAddItemSheetOpen(false)
            }}
          />
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
            className="h-12"
          />
          {/* "Find food" is the alternative to the manual item sheet above
           * (#106) — fill in macros via "+ Add item", or find an existing
           * dish instead. The manual path's own "Add" now lives inside
           * MealItemEditorSheet, so there's no separate button here. */}
          <p className="text-center text-xs text-muted-foreground">
            {t.dailyEntry.orDivider}
          </p>
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

      {/* Moved here, next to the Day note, rather than up with the other
       * morning fields (#101) — unlike Weight/Sleep, step count usually
       * isn't known until later in the day, so its old position up top
       * implied it should be filled in at the same time as those. */}
      {showStepsAsDisplay ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">{t.dailyEntry.stepsLabel}</span>
          <div className="flex h-12 items-center justify-between rounded-lg bg-muted px-3">
            <span className="text-sm text-foreground">
              {steps === undefined ? '—' : formatNumber(steps, locale, 0)}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-xl"
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
          <div className="flex items-center gap-3">
            <Input
              type="text"
              inputMode="numeric"
              aria-label={t.dailyEntry.stepsLabel}
              aria-invalid={errors.steps ? true : undefined}
              className="h-12 w-24"
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
              size="icon-xl"
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

      {showNoteAsDisplay ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">{t.dailyEntry.noteLabel}</span>
          <div className="flex h-12 items-center justify-between rounded-lg bg-muted px-3">
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
              size="icon-xl"
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
          <div className="flex items-center gap-3">
            <Input
              type="text"
              aria-label={t.dailyEntry.noteLabel}
              aria-invalid={errors.note ? true : undefined}
              placeholder={t.dailyEntry.noteFieldPlaceholder}
              className="h-12 flex-1"
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
              size="icon-xl"
              aria-label={t.dailyEntry.saveNoteLabel}
              onClick={saveNote}
            >
              <Check aria-hidden="true" />
            </Button>
          </div>
          {errors.note && (
            <p className="text-sm text-destructive">{errors.note.message}</p>
          )}
          <div className="flex items-center gap-3">
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

      {/* Surfaced directly on Today (previously only reachable via History's
       * DayDetail, which users found hard to discover) — both options are
       * always shown rather than a single unlabeled toggle, so the current
       * state reads unambiguously without relying on a highlight color
       * alone. Placed outside the note/mood block above so it stays visible
       * regardless of that block's own display/edit state. */}
      {digestionTrackingEnabled && (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">
            {t.dailyEntry.hadConstipationLabel}
          </span>
          <ToggleGroup
            type="single"
            aria-label={t.dailyEntry.hadConstipationLabel}
            value={hadConstipation ? 'yes' : 'no'}
            onValueChange={(value) =>
              value && setHadConstipation(value === 'yes')
            }
            className="w-fit"
          >
            <ToggleGroupItem value="no" className="h-12 px-6 text-base">
              {t.dailyEntry.hadConstipationNoOption}
            </ToggleGroupItem>
            <ToggleGroupItem value="yes" className="h-12 px-6 text-base">
              {t.dailyEntry.hadConstipationYesOption}
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      )}
    </form>
  )
}
