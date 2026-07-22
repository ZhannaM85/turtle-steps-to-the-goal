import { useEffect, useRef, useState } from 'react'
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
import { format, parseISO, subDays } from 'date-fns'
import { Clock, GripVertical, Pencil, Trash2, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { foods } from '@/data/foods'
import type {
  CalorieEntry,
  CalorieItem,
  DailyEntry,
  MealEmotion,
} from '@/domain/dailyEntry'
import {
  calorieEntryCarbs,
  calorieEntryFat,
  calorieEntryKcal,
  calorieEntryProtein,
  totalCalories,
} from '@/domain/dailyEntry'
import type { MealItem } from '@/domain/mealItem'
import {
  formatNumber,
  useLocale,
  useTranslation,
  type Dictionary,
  type Locale,
} from '@/i18n'
import { IndexedDbDailyEntryRepository } from '@/infrastructure/persistence/indexeddb'
import { MEAL_EMOTIONS } from '@/shared/lib/emotionIcons'
import {
  formatMacroGrams,
  macrosSummaryText,
  macrosSummaryTextCompact,
} from '@/shared/lib/macroDisplay'
import {
  formatComputedTotal,
  parseOptionalMacro,
  portionsToGrams,
  ratesFromAbsolute,
  scaleFromPer100g,
  totalFromPortion,
} from '@/shared/lib/macroScaling'
import { defaultMealLabel, effectiveMealLabel } from '@/shared/lib/mealLabel'
import { parseNumberInput } from '@/shared/lib/parseNumberInput'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  useAddMealRowCollapseStore,
  useMealItemStore,
  useMealLabelPresetStore,
} from '@/stores'
import { CopyDayMealsDialog } from './CopyDayMealsDialog'
import { FoodPickerDialog, type PickedFoodValues } from './FoodPickerDialog'
import { clearMealDraft, loadMealDraft, saveMealDraft } from './mealDraftStorage'
import { MealItemEditorSheet } from './MealItemEditorSheet'
import { RepeatMealDialog } from './RepeatMealDialog'

// Every curated food's name in either locale (#150) — names an item picked
// via FoodPickerDialog can carry, distinct from a name the user actually
// typed themselves. `foods.ts` is static, so this only needs computing once
// rather than per-render or per-save.
const curatedFoodNames = new Set(foods.flatMap((food) => [food.en, food.ru]))

// #190: own repository instance, same no-shared-store pattern as
// MealEditScreen/useHistoryData/useDashboardData — fetches the day
// *before* `date` to power the "Repeat yesterday's [meal]" quick action.
const dailyEntryRepository = new IndexedDbDailyEntryRepository()

/** One item's draft fields while its parent meal group is being edited
 * (#81) — plain strings, same pattern as the rest of this form's add/edit
 * local state. `id` is the real item id for an existing item, or a fresh
 * uuid for a blank row added during this edit session; either way it's
 * used as-is for the saved item's id, so editing doesn't churn ids that
 * didn't change. */
interface EditItemDraft {
  id: string
  name: string
  brand: string
  amount: string
  protein: string
  fat: string
  carbs: string
  amountG: string
  // Per 100g / Per portion entry mode (#111) — always starts as 'per100g'
  // when opening an existing item for edit, even if it was originally
  // logged in "per portion" mode: the back-calculated rate (via
  // ratesFromAbsolute below) is mathematically identical to what was
  // typed when no portion weight was recorded (portions defaults to 1,
  // i.e. 100g), so there's no information lost by not persisting the
  // original mode.
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
    brand: item.brand ?? '',
    amount: String(rates.kcal100),
    protein: rates.protein100 === undefined ? '' : String(rates.protein100),
    fat: rates.fat100 === undefined ? '' : String(rates.fat100),
    carbs: rates.carbs100 === undefined ? '' : String(rates.carbs100),
    amountG: String(rates.portions),
    macroMode: 'per100g',
    emotion: item.emotion,
  }
}

/** Everything the bottom "+ Add item" add-row holds before its meal group
 * is actually saved (#221) — persisted to localStorage so a page reload or
 * navigating away mid-typing doesn't lose it, unlike the rest of this
 * form's fields, which already commit immediately on their own Save. */
interface AddRowDraft {
  itemName: string
  itemBrand: string
  amount: string
  protein: string
  fat: string
  carbs: string
  amountG: string
  macroMode: 'per100g' | 'perPortion'
  itemEmotion: MealEmotion | undefined
  stagedItems: EditItemDraft[]
  groupNote: string
  time: string
}

function blankItemDraft(): EditItemDraft {
  return {
    id: crypto.randomUUID(),
    name: '',
    brand: '',
    amount: '',
    protein: '',
    fat: '',
    carbs: '',
    amountG: '1',
    macroMode: 'per100g',
    emotion: undefined,
  }
}

/** Shared by saveEditMeal (an existing meal's edit-mode Save) and addMeal
 * (the add row's Save, #183) — converts staged item drafts into real
 * CalorieItems, scaling each by its own macro mode. A draft with no valid
 * kcal is dropped silently rather than blocking the whole group's save on
 * it — an accidentally-blank row added via "+ Add item" and never filled
 * in shouldn't hold everything else hostage. */
function draftsToItems(drafts: EditItemDraft[]): CalorieItem[] {
  return drafts.flatMap((draft) => {
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
        brand: draft.brand.trim() || undefined,
        ...scaled,
        emotion: draft.emotion,
      },
    ]
  })
}

/** Default for a newly-added meal's time-eaten field (#65) — "the time when
 * user enters the entry". Not used for editing an existing meal, which
 * reflects whatever time (if any) was already saved on it. */
function currentTimeHHMM(): string {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
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
    field: 'name' | 'brand' | 'amount' | 'protein' | 'fat' | 'carbs' | 'amountG',
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
  onCancelEdit: () => void
  onRequestDelete: () => void
  onConfirmDelete: () => void
  onCancelDelete: () => void
  /** Which editItems draft (by id) has its full-screen editor sheet open
   * (#122) — null when none. */
  openEditItemId: string | null
  onOpenEditItem: (id: string | null) => void
  /** "Find food" for an item within this meal (#124) — pushes every picked
   * food (#183: one or more) straight into the shared editItems staging
   * array, same as onAddEditItem's manual blank row. */
  onAddFood: (values: PickedFoodValues[]) => void
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
  onCancelEdit,
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
  // Own local dialog state (#124), not lifted higher — each MealListItem's
  // "Find food" is independent of every other one and of the bottom add
  // row's own isFoodPickerOpen.
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
  // "Save and add one more" (#183) only makes sense while adding a
  // genuinely new dish, not while editing one that was already part of
  // this meal before this edit session started — a draft counts as new
  // if its id isn't among the entry's own original items.
  const isOpenDraftNew =
    openDraft !== null && !entry.items.some((item) => item.id === openDraft.id)

  if (isConfirmingDelete) {
    return (
      <li
        ref={setNodeRef}
        style={style}
        // #143: same card treatment (bg-card/ring) as the other two
        // MealListItem states below, so a meal doesn't lose its card
        // boundary mid-delete-confirm.
        className="flex items-center gap-2 rounded-xl bg-card p-3 ring-1 ring-foreground/10 whitespace-nowrap"
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
        // #143: card treatment (bg-card/ring), matching the app's existing
        // StatCard look — was a plain bg-muted/40 tint before.
        className="flex flex-col gap-2 rounded-xl bg-card p-3 ring-1 ring-foreground/10"
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
          {/* #169 — Save/Delete used to be the only ways out of edit mode;
           * an accidental pencil tap or a change of mind had no way back
           * without committing or destroying something. */}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t.dailyEntry.cancelEditMealLabel(position)}
            onClick={onCancelEdit}
          >
            <X aria-hidden="true" />
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
                {/* min-w-0 (found live, correlated with longer dish names):
                 * a flex item's default min-width is `auto`, which refuses
                 * to shrink below its content's natural (untruncated)
                 * width — so `truncate` alone silently did nothing for a
                 * long name, and this row (and the card/page around it)
                 * got pushed wider than the viewport instead of the text
                 * actually ellipsizing. */}
                <span className="min-w-0 flex-1 truncate text-sm">
                  {item.name || t.dailyEntry.itemNamePlaceholder}
                  {item.brand && ` (${item.brand})`}
                  {itemTotalPreview && (
                    <span className="text-muted-foreground">
                      {' '}
                      — {itemTotalPreview}
                    </span>
                  )}
                  {itemEmotionOption && (
                    <>
                      {' '}
                      {/* leading-none removed (#156 follow-up, correlated
                       * live with the emoji specifically): a larger
                       * text-sm glyph forced to line-height:1 inside
                       * text-xs wrapping/truncating text left an
                       * inconsistent line-box height, which WebKit could
                       * render as visible overlap with the line above.
                       * Letting it inherit the surrounding line-height
                       * keeps every line in the paragraph the same
                       * height. */}
                      <span aria-hidden="true" className="text-sm">
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
        {/* "Find food" for an item within this existing meal (#124) —
         * FoodPickerDialog was previously only reachable from the bottom
         * add row, leaving no way to search the food list while editing an
         * already-existing meal. #153: reordered ahead of "+ Add item" and
         * made primary, matching the add row's own reordering — search
         * first, manual entry as the fallback. */}
        <Button
          type="button"
          size="lg"
          className="h-12 w-full text-base"
          aria-label={`${t.dailyEntry.addFoodButton} — ${t.dailyEntry.mealLabel(position)}`}
          onClick={() => setIsFoodPickerOpen(true)}
        >
          {t.dailyEntry.addFoodButton}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          {t.dailyEntry.orDivider}
        </p>
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
            brand={openDraft.brand}
            onBrandChange={(value) =>
              onEditItemFieldChange(openDraft.id, 'brand', value)
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
            onSaveAndAddAnother={
              isOpenDraftNew
                ? () => onOpenEditItem(onAddEditItem())
                : undefined
            }
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
        {/* #158 (revisits #146): a small icon-only checkmark next to the
         * name input didn't read as "the button that saves everything in
         * this card" — moved to a full-width, text-labeled button at the
         * bottom, same size/prominence as MealItemEditorSheet's own Save,
         * so it's unambiguous this confirms the whole edit, not just the
         * name. */}
        <Button
          type="button"
          size="lg"
          className="h-12 w-full text-base"
          onClick={onSaveEdit}
        >
          {t.dailyEntry.saveButton}
        </Button>
      </li>
    )
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      // #143: card treatment (bg-card/ring), matching the app's existing
      // StatCard look ("This week's target"/"vs. yesterday") — was a plain
      // list row with no background/border before.
      className={cn(
        'flex flex-col gap-1.5 rounded-xl bg-card p-3 ring-1 ring-foreground/10',
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
              {item.name &&
                `${item.name}${item.brand ? ` (${item.brand})` : ''} — `}
              {formatNumber(item.amountKcal, locale, 0)} {t.dailyEntry.kcalUnit}
              {/* #206: this line otherwise never surfaces the item's own
               * quantity anywhere — the only place it existed before was
               * inside the add/edit form's own quantity input, gone once
               * the item is saved. Omitted (not shown as "—") when unset,
               * same as itemMacros/itemEmotionOption below, rather than
               * cluttering every manually-typed item with no recorded
               * quantity. */}
              {item.amountG !== undefined &&
                ` · ${formatMacroGrams(item.amountG, locale, t)}`}
              {itemMacros && ` · ${itemMacros}`}
              {itemEmotionOption && (
                <>
                  {' '}
                  {/* leading-none removed (#156 follow-up) — see the
                   * matching comment on the edit-mode item row above. */}
                  <span aria-hidden="true" className="text-sm">
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

export interface MealListProps {
  calorieEntries: CalorieEntry[]
  /** Replaces the whole meal-group list on any add/edit/delete/reorder
   * (#145) — the caller decides how to persist it: `DailyEntryForm`
   * folds it into the day's react-hook-form state, `DayDetail` builds a
   * fresh `DailyEntry` and calls its own `onSaved`. `MealList` itself has
   * no idea which. */
  onChange: (next: CalorieEntry[]) => void
  /** This day's date (#157) — needed to build the dedicated single-meal
   * edit route's URL (`/entry/:date/meal/:mealId`) when a meal's pencil
   * is clicked. */
  date: string
  /** Set only by `MealEditScreen` (#157) — when present, this meal's edit
   * mode opens automatically on mount, the "add a new meal" bottom row is
   * hidden entirely, and `onFocusedMealDone` fires once editing ends
   * (save, cancel, or delete) so the screen can navigate back. Absent
   * (undefined) for every normal Today/History mount — clicking a meal's
   * pencil there navigates to `/entry/:date/meal/:mealId` instead of
   * opening inline edit mode directly (#157 replaced the #145 inline
   * behavior; the *editing itself* still runs through this exact same
   * `isEditing` branch, just always reached via the dedicated route now,
   * never via a direct click-to-expand). */
  focusMealId?: string
  /** The focused meal's real position within the *full* day's meal list
   * (#187) — `calorieEntries` here is always a single-element array in
   * focused mode, so the render loop's own `index + 1` is always `1`;
   * without this, every meal's placeholder/aria-labels would read as
   * "Breakfast"/"Meal 1" regardless of which meal it actually is.
   * Required whenever `focusMealId` is set. */
  focusMealPosition?: number
  onFocusedMealDone?: () => void
}

/**
 * The meal-group list + bottom add row (#81/#96/#111/#122/#124), extracted
 * from `DailyEntryForm.tsx` (#145) so it can be mounted on its own —
 * originally the only way to reach this UI was inside the full daily-log
 * form, which meant editing a single already-logged meal from History
 * pulled in Weight/Sleep/Steps/Note too (`EntryRow.tsx`'s `alwaysEditable`
 * mode). `DailyEntryForm` still mounts this exactly as before; `DayDetail`
 * (History's read-only expand-row and the calendar day panel) now mounts
 * it too, so meals are editable there without ever needing "Edit day."
 * Owns all of its own local edit/add-row state — nothing here is
 * react-hook-form, so there's no dependency on a parent form instance.
 */
export function MealList({
  calorieEntries,
  onChange,
  date,
  focusMealId,
  focusMealPosition,
  onFocusedMealDone,
}: MealListProps) {
  const t = useTranslation()
  const locale = useLocale()
  const navigate = useNavigate()

  function setCalorieEntries(next: CalorieEntry[]) {
    onChange(next)
  }

  // #190: the day immediately before `date` — fetched to power "Repeat
  // yesterday's [meal]" on the add row. Not "today's real yesterday": for
  // a History-opened past day, this is that day's own prior day, so the
  // quick action stays correct wherever MealList is mounted.
  const previousDate = format(subDays(parseISO(date), 1), 'yyyy-MM-dd')
  const [previousDayEntry, setPreviousDayEntry] = useState<DailyEntry | null>(
    null,
  )
  useEffect(() => {
    let cancelled = false
    dailyEntryRepository
      .getByDate(previousDate)
      .then((result) => {
        if (!cancelled) setPreviousDayEntry(result ?? null)
      })
      .catch(() => {
        // Best-effort, same as usePastGoals/useMaxRecordedWeight — losing
        // the repeat-meal quick action for this render isn't worth
        // surfacing as an error state.
      })
    return () => {
      cancelled = true
    }
  }, [previousDate])

  // #221: whatever add-row draft survived from an earlier, interrupted
  // session on this same date, if any — read once via a lazy initializer
  // (this whole component remounts on date change, `key={date}` upstream,
  // so there's no need to react to `date` changing after mount). Each
  // add-* field below seeds from it instead of a blank default.
  const [initialAddDraft] = useState(() => loadMealDraft<AddRowDraft>(date))

  // These four describe the item currently being entered in the bottom Add
  // row. #183: "Save and add one more" stages the current fields into
  // addStagedItems (below) and resets these back to blank for the next
  // dish, rather than committing a brand-new meal group per item — the
  // final Save folds addStagedItems + these current fields into one group.
  const [addAmount, setAddAmount] = useState(initialAddDraft?.amount ?? '')
  const [addProtein, setAddProtein] = useState(initialAddDraft?.protein ?? '')
  const [addFat, setAddFat] = useState(initialAddDraft?.fat ?? '')
  const [addCarbs, setAddCarbs] = useState(initialAddDraft?.carbs ?? '')
  const [addAmountG, setAddAmountG] = useState(initialAddDraft?.amountG ?? '1')
  // Per 100g / Per portion entry mode (#111) — 'per100g' is the default,
  // unchanged behavior. Switching modes converts the currently-typed
  // numbers (via handleAddMacroModeChange below) rather than leaving them
  // to be silently reinterpreted with a different meaning.
  const [addMacroMode, setAddMacroMode] = useState<'per100g' | 'perPortion'>(
    initialAddDraft?.macroMode ?? 'per100g',
  )
  const [addItemName, setAddItemName] = useState(initialAddDraft?.itemName ?? '')
  const [addItemBrand, setAddItemBrand] = useState(
    initialAddDraft?.itemBrand ?? '',
  )
  // This item's own reaction (#129) — moved from the meal group; grouped
  // with the other per-item draft fields above, not the group-level ones
  // below.
  const [addItemEmotion, setAddItemEmotion] = useState<
    MealEmotion | undefined
  >(initialAddDraft?.itemEmotion)
  // Dishes already committed via "Save and add one more" (#183) during
  // this add-row session, waiting for the final Save to fold them (plus
  // whatever's currently in the fields above) into one new meal group —
  // same EditItemDraft shape and same flatMap-drops-invalid-rows handling
  // (draftsToItems) as an existing meal's own editItems staging array.
  const [addStagedItems, setAddStagedItems] = useState<EditItemDraft[]>(
    initialAddDraft?.stagedItems ?? [],
  )
  // Group-level fields (#81) — note/time-eaten belong to the meal as a
  // whole, not to any one item within it.
  const [addGroupNote, setAddGroupNote] = useState(
    initialAddDraft?.groupNote ?? '',
  )
  // Time eaten (#65) — starts empty rather than defaulting to "now" (#82):
  // a pre-filled value read as already-confirmed/correct and went unnoticed
  // when it didn't match. Resets to empty after each add, same as the
  // other add-* fields.
  const [addTime, setAddTime] = useState(initialAddDraft?.time ?? '')
  // #221: persists the add-row draft on every change, and clears it once
  // every draftable field is back to blank (either a successful addMeal()
  // resets them, or the user manually cleared everything by hand) — rather
  // than leaving a stale blob behind once there's nothing left to recover.
  // addAmountG/addMacroMode are deliberately excluded from the blank check:
  // they always carry a non-empty default ('1'/'per100g') even when
  // nothing has actually been typed, so including them would prevent the
  // all-blank case from ever being detected.
  useEffect(() => {
    const isBlank =
      addStagedItems.length === 0 &&
      addGroupNote === '' &&
      addTime === '' &&
      addItemName === '' &&
      addItemBrand === '' &&
      addAmount === '' &&
      addProtein === '' &&
      addFat === '' &&
      addCarbs === '' &&
      addItemEmotion === undefined
    if (isBlank) {
      clearMealDraft(date)
      return
    }
    saveMealDraft<AddRowDraft>(date, {
      itemName: addItemName,
      itemBrand: addItemBrand,
      amount: addAmount,
      protein: addProtein,
      fat: addFat,
      carbs: addCarbs,
      amountG: addAmountG,
      macroMode: addMacroMode,
      itemEmotion: addItemEmotion,
      stagedItems: addStagedItems,
      groupNote: addGroupNote,
      time: addTime,
    })
  }, [
    date,
    addItemName,
    addItemBrand,
    addAmount,
    addProtein,
    addFat,
    addCarbs,
    addAmountG,
    addMacroMode,
    addItemEmotion,
    addStagedItems,
    addGroupNote,
    addTime,
  ])
  // Quantity-based entry against the static food list (#62) — an alternative
  // to manual kcal/macro entry, not a replacement for it.
  const [isFoodPickerOpen, setIsFoodPickerOpen] = useState(false)
  // #202: opens RepeatMealDialog's preview/selective-pick sheet instead of
  // #190's original immediate one-tap commit.
  const [isRepeatDialogOpen, setIsRepeatDialogOpen] = useState(false)
  // #253: whole-day sibling of the above — CopyDayMealsDialog's own
  // preview/selective-pick sheet, extended over every meal group in the
  // source day instead of just the one at this position.
  const [isCopyDayDialogOpen, setIsCopyDayDialogOpen] = useState(false)
  // Full-screen item editor sheet (#122) — the add row's own instance,
  // opened by its "+ Add item" trigger. Closing it (via Save or the X)
  // never clears the underlying add-* state, so a half-filled draft
  // survives reopening.
  const [isAddItemSheetOpen, setIsAddItemSheetOpen] = useState(false)
  // #201 (redesign of #199): past days default collapsed — no reason to
  // expect new meals on an old day — derived straight from date
  // comparison, not persisted (a past day's manual expansion is local to
  // that viewing session and resets on the next remount, same simplicity
  // #199 originally wanted). *Today* defaults expanded, but a manual
  // collapse now actually persists across navigation via
  // useAddMealRowCollapseStore, replacing #199's plain component state —
  // that reset on any remount, not just a new day, which included ones
  // that aren't a new day at all (a MealEditScreen round trip, switching
  // tabs and back), reading as broken rather than intentional.
  const isPastDay = date < format(new Date(), 'yyyy-MM-dd')
  const [isPastDayExpanded, setIsPastDayExpanded] = useState(false)
  const collapsedDateForToday = useAddMealRowCollapseStore(
    (state) => state.collapsedDate,
  )
  const setCollapsedForToday = useAddMealRowCollapseStore(
    (state) => state.setCollapsed,
  )
  const isAddRowCollapsed = isPastDay
    ? !isPastDayExpanded
    : collapsedDateForToday === date
  function setIsAddRowCollapsed(collapsed: boolean) {
    if (isPastDay) {
      setIsPastDayExpanded(!collapsed)
    } else {
      setCollapsedForToday(date, collapsed)
    }
  }
  // Dedicated single-meal edit route support (#157) — computed
  // unconditionally on every render (a cheap array find), but only its
  // *first* result ever matters: each lazy useState initializer below
  // reads it to pre-open focusMealId's edit mode on mount, exactly as if
  // its pencil had just been clicked. Lazy initializers rather than a
  // mount effect calling startEditMeal — setState calls directly inside
  // an effect body are flagged by the React Compiler's lint rule, and
  // this is what useState's own lazy-init form exists for.
  const focusedMealForInit = focusMealId
    ? calorieEntries.find((entry) => entry.id === focusMealId)
    : undefined
  const [editingMealId, setEditingMealId] = useState<string | null>(
    () => focusedMealForInit?.id ?? null,
  )
  // One draft per item in the group being edited (#81) — see EditItemDraft.
  const [editItems, setEditItems] = useState<EditItemDraft[]>(() =>
    focusedMealForInit ? focusedMealForInit.items.map(itemDraftFrom) : [],
  )
  // Which editItems draft (by id) has its full-screen editor sheet open
  // (#122) — null when none. Reset on save/delete so it can't dangle
  // pointing at a draft that no longer exists.
  const [openEditItemId, setOpenEditItemId] = useState<string | null>(null)
  const [editGroupLabel, setEditGroupLabel] = useState(
    () => focusedMealForInit?.label ?? '',
  )
  const [editGroupTime, setEditGroupTime] = useState(
    () => focusedMealForInit?.timeEaten ?? '',
  )
  const [editGroupNote, setEditGroupNote] = useState(
    () => focusedMealForInit?.note ?? '',
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

  // Reusable meal-name suggestions (#50) — loaded once per mount, a
  // library shared across days, not scoped to this entry.
  const mealItems = useMealItemStore((state) => state.items)
  const loadMealItems = useMealItemStore((state) => state.loadItems)
  const touchMealItem = useMealItemStore((state) => state.touch)
  useEffect(() => {
    loadMealItems()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fires onFocusedMealDone once editing the focused meal actually ends —
  // save, cancel, or delete all funnel through the same setEditingMealId
  // (null) call, so this only needs to watch that one piece of state
  // rather than wrapping three separate handlers.
  const hasOpenedFocusedMeal = useRef(false)
  useEffect(() => {
    if (!focusMealId) return
    if (editingMealId === focusMealId) {
      hasOpenedFocusedMeal.current = true
      return
    }
    if (hasOpenedFocusedMeal.current && editingMealId === null) {
      onFocusedMealDone?.()
    }
  }, [editingMealId, focusMealId, onFocusedMealDone])

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
          portionsToGrams(addAmountG),
        )
        setAddAmount(String(rates.kcal100))
        setAddProtein(
          rates.protein100 === undefined ? '' : String(rates.protein100),
        )
        setAddFat(rates.fat100 === undefined ? '' : String(rates.fat100))
        setAddCarbs(rates.carbs100 === undefined ? '' : String(rates.carbs100))
        setAddAmountG(String(rates.portions))
      }
    }
    setAddMacroMode(newMode)
  }

  // Shared by addMeal()'s post-add reset, stageAddItem() (#183), and the
  // "+ Add item" trigger's own clear button (#151) — just the per-item
  // draft fields, not the meal-group-level note/time next to it.
  function resetItemDraft() {
    setAddAmount('')
    setAddAmountG('1')
    setAddProtein('')
    setAddFat('')
    setAddCarbs('')
    setAddMacroMode('per100g')
    setAddItemName('')
    setAddItemBrand('')
    setAddItemEmotion(undefined)
  }

  // The add row's current fields as one draft, in the same shape staged
  // items and an existing meal's editItems already use (#183) — lets
  // addMeal()/stageAddItem() share draftsToItems() instead of duplicating
  // the per-100g/per-portion scaling logic a third time.
  function currentAddDraft(): EditItemDraft {
    return {
      id: crypto.randomUUID(),
      name: addItemName,
      brand: addItemBrand,
      amount: addAmount,
      protein: addProtein,
      fat: addFat,
      carbs: addCarbs,
      amountG: addAmountG,
      macroMode: addMacroMode,
      emotion: addItemEmotion,
    }
  }

  // "Save and add one more" (#183) — commits the current fields as a
  // staged dish (not yet a real meal) and clears them for the next one,
  // keeping the group-level note/time and the sheet itself open. A blank
  // draft (no valid amount) is simply not staged, matching MealItemEditor
  // Sheet's own hasValidAmount disabled-button guard on this action.
  function stageAddItem() {
    const amountNum = parseNumberInput(addAmount)
    if (!amountNum || amountNum <= 0) return
    setAddStagedItems((items) => [...items, currentAddDraft()])
    resetItemDraft()
  }

  // Folds every staged dish (#183) plus whatever's currently in the fields
  // into one new meal group — same "invalid/blank rows drop out silently"
  // handling as an existing meal's own saveEditMeal, via draftsToItems.
  function addMeal() {
    const items = draftsToItems([...addStagedItems, currentAddDraft()])
    if (items.length === 0) return
    setCalorieEntries([
      ...calorieEntries,
      {
        id: crypto.randomUUID(),
        items,
        note: addGroupNote.trim() || undefined,
        timeEaten: addTime || undefined,
        createdAt: new Date().toISOString(),
      },
    ])
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
    setAddStagedItems([])
    resetItemDraft()
    setAddGroupNote('')
    setAddTime('')
  }

  // #190: the previous day's meal at this same position, if any — "same
  // position" because that's already how this app defines a meal's
  // identity (#141's positional Breakfast/Lunch/Dinner/Snack defaults),
  // not by matching label text. Only offered for the *next* meal about to
  // be added (calorieEntries.length is that meal's 0-indexed position in
  // both days' lists).
  const previousMeal = previousDayEntry?.calorieEntries?.[calorieEntries.length]

  // #253: every meal from the source day with at least one item, for
  // "Copy yesterday's meals" — independent of the single-position matching
  // `previousMeal` above uses, and available regardless of how many meals
  // today already has.
  const previousDayMealGroups = (previousDayEntry?.calorieEntries ?? []).filter(
    (group) => group.items.length > 0,
  )

  // #253: mirrors repeatSelectedItems below, over several meal groups at
  // once instead of one — each selected group becomes its own new
  // CalorieEntry (fresh ids, dropping emotion), appended to today in a
  // single setCalorieEntries call rather than one per meal.
  function copyDaySelectedGroups(
    selectedGroups: { label: string | undefined; items: CalorieItem[] }[],
  ) {
    if (selectedGroups.length === 0) return
    const newEntries: CalorieEntry[] = selectedGroups.map((group) => ({
      id: crypto.randomUUID(),
      label: group.label,
      items: group.items.map((item) => ({
        ...item,
        id: crypto.randomUUID(),
        emotion: undefined,
      })),
      createdAt: new Date().toISOString(),
    }))
    setCalorieEntries([...calorieEntries, ...newEntries])
    for (const newEntry of newEntries) {
      for (const item of newEntry.items) {
        if (item.name && !curatedFoodNames.has(item.name)) {
          touchMealItem(item.name, {
            amountKcal: item.amountKcal,
            proteinG: item.proteinG,
            fatG: item.fatG,
            carbsG: item.carbsG,
            amountG: item.amountG,
          })
        }
      }
    }
  }

  // Clones only the objective food data (name + macros + amountG) — not
  // time/note/emotion, which are day-specific journal details rather than
  // "what was eaten," so re-adding those quickly by hand if relevant stays
  // far cheaper than what this is actually solving (retyping every dish's
  // macros). Fresh ids for the new day's own records; touches the meal-item
  // dictionary the same way every other add path does, skipping curated
  // food names (#150) so they don't leak into the personal library.
  // #202: takes just the dishes the user kept checked in RepeatMealDialog's
  // preview, not necessarily all of `previousMeal.items` — #190 originally
  // committed the whole meal immediately with no way to leave one out.
  function repeatSelectedItems(selected: CalorieItem[]) {
    if (!previousMeal || selected.length === 0) return
    const items: CalorieItem[] = selected.map((item) => ({
      ...item,
      id: crypto.randomUUID(),
      emotion: undefined,
    }))
    setCalorieEntries([
      ...calorieEntries,
      {
        id: crypto.randomUUID(),
        items,
        label: previousMeal.label,
        createdAt: new Date().toISOString(),
      },
    ])
    for (const item of items) {
      if (item.name && !curatedFoodNames.has(item.name)) {
        touchMealItem(item.name, {
          amountKcal: item.amountKcal,
          proteinG: item.proteinG,
          fatG: item.fatG,
          carbsG: item.carbsG,
          amountG: item.amountG,
        })
      }
    }
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
    setAddAmountG(String(rates.portions))
  }

  // Quantity-based entry against the static food list (#62) — the dialog
  // already computed kcal/macros scaled by quantity for every dish checked
  // (#183: one or more); this adds the whole batch as a single new meal
  // group (#81) with one item per dish, same as the manual Add row above.
  // A self-contained action — it commits immediately (no extra confirm
  // step, same as before #183), so it doesn't fold into addStagedItems;
  // combining a Find-food pick with a manually-entered dish in one group
  // still works the same way it always has, by editing the meal afterward.
  function addFoodEntry(values: PickedFoodValues[]) {
    if (values.length === 0) return
    setCalorieEntries([
      ...calorieEntries,
      {
        id: crypto.randomUUID(),
        items: values.map((value) => ({
          id: crypto.randomUUID(),
          name: value.note,
          amountKcal: value.amountKcal,
          proteinG: value.proteinG,
          fatG: value.fatG,
          carbsG: value.carbsG,
          amountG: value.amountG,
          emotion: value.emotion,
        })),
        timeEaten: currentTimeHHMM(),
        createdAt: new Date().toISOString(),
      },
    ])
  }

  // "Find food" for an item within an already-existing meal being edited —
  // FoodPickerDialog was previously only wired to the bottom add row
  // (addFoodEntry above), leaving no way to search the food list while
  // editing an existing meal, only manual entry via "+ Add item". Converts
  // each picked food's absolute totals to a per-100g rate + quantity via
  // ratesFromAbsolute, same as selectEditItemMealItem's "restore a
  // suggestion" path — picking a food always lands in per-100g mode.
  // #183: values is every dish checked in one Find-food session, not just
  // one — all land in editItems together in a single update.
  function addFoodToEditItems(values: PickedFoodValues[]) {
    const drafts: EditItemDraft[] = values.map((value) => {
      const rates = ratesFromAbsolute(
        value.amountKcal,
        value.proteinG,
        value.fatG,
        value.carbsG,
        value.amountG,
      )
      return {
        id: crypto.randomUUID(),
        name: value.note,
        brand: '',
        amount: String(rates.kcal100),
        protein: rates.protein100 === undefined ? '' : String(rates.protein100),
        fat: rates.fat100 === undefined ? '' : String(rates.fat100),
        carbs: rates.carbs100 === undefined ? '' : String(rates.carbs100),
        amountG: String(rates.portions),
        macroMode: 'per100g',
        emotion: value.emotion,
      }
    })
    setEditItems((items) => [...items, ...drafts])
  }

  // #169 — before this, Save (or Delete) was the only way out of edit
  // mode; an accidental pencil tap or a change of mind had no way back
  // without committing or destroying something. editItems/editGroup* are
  // just local staging state — discarding them here needs nothing but
  // closing the edit state itself (#157: there's no longer a re-entry
  // path into edit mode within the same mount to worry about restaging
  // for, since it's only ever opened once, via focusMealId's lazy
  // useState initializers on mount).
  function cancelEditMeal() {
    setEditingMealId(null)
    setOpenEditItemId(null)
  }

  function updateEditItemField(
    id: string,
    field: 'name' | 'brand' | 'amount' | 'protein' | 'fat' | 'carbs' | 'amountG',
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
          portionsToGrams(draft.amountG),
        )
        return {
          ...draft,
          amount: String(rates.kcal100),
          protein:
            rates.protein100 === undefined ? '' : String(rates.protein100),
          fat: rates.fat100 === undefined ? '' : String(rates.fat100),
          carbs: rates.carbs100 === undefined ? '' : String(rates.carbs100),
          amountG: String(rates.portions),
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
              amountG: String(rates.portions),
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

  // Drafts with no valid kcal are dropped silently (draftsToItems) rather
  // than blocking Save on them — an accidentally-blank row added via
  // "+ Add item" and never filled in shouldn't hold the whole edit
  // hostage. If every item drops out, the group itself is removed (#81's
  // "last item removed = meal removed").
  function saveEditMeal() {
    const items = draftsToItems(editItems)
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
      // Skip names that are actually a curated food, picked via
      // FoodPickerDialog rather than typed by hand (#150) — otherwise
      // saving any edit to a meal containing one leaks it into the
      // personal dictionary, which addFoodEntry() already correctly
      // avoids doing on the initial add.
      if (item.name && !curatedFoodNames.has(item.name)) {
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
  const addScaledPreview =
    addAmountPreview && addAmountPreview > 0
      ? addMacroMode === 'per100g'
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
          )
      : null
  const addTotalPreview = addScaledPreview
    ? formatComputedTotal(addScaledPreview, locale, t)
    : null
  // #260: this meal hasn't been saved yet — nothing about it is reflected
  // in `calorieEntries` yet, so "today would be" is simply today's current
  // total plus this draft, no risk of double-counting. (An already-saved
  // meal's own edit sheet doesn't get this: that meal's *old* total is
  // still sitting in `calorieEntries` until its outer Save commits the
  // replacement, so the correct number there is a whole-meal delta, not
  // this simple sum — left for a follow-up rather than shown wrong.)
  const todayTotalPreview = addScaledPreview
    ? t.dailyEntry.todayWouldBeLabel(
        `${formatNumber((totalCalories(calorieEntries) ?? 0) + addScaledPreview.amountKcal, locale, 0)} ${t.dailyEntry.kcalUnit}`,
        `${formatNumber(totalCalories(calorieEntries) ?? 0, locale, 0)} ${t.dailyEntry.kcalUnit}`,
      )
    : null

  return (
    <div className="flex flex-col gap-3">
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
                  // #187: calorieEntries is a single-element array in
                  // focused mode, so index is always 0 — use the real
                  // position passed down from MealEditScreen instead.
                  position={focusMealId ? (focusMealPosition ?? 1) : index + 1}
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
                  // #157: navigates to the dedicated single-meal edit
                  // route instead of opening inline edit mode directly —
                  // only reachable from the view-mode branch, which never
                  // renders while focusMealId is already open in edit
                  // mode, so this can't fire during a focused mount.
                  onStartEdit={() =>
                    navigate(`/entry/${date}/meal/${entry.id}`)
                  }
                  onSaveEdit={saveEditMeal}
                  onCancelEdit={cancelEditMeal}
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

      {/* #253 — a day-level action, so it's independent of the add row's
       * own collapse state below and always offered (when available)
       * regardless of how many meals today already has. Hidden in the
       * single-meal edit route for the same reason the add row is. */}
      {!focusMealId && previousDayMealGroups.length > 0 && (
        <>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-12 w-full text-base"
            onClick={() => setIsCopyDayDialogOpen(true)}
          >
            {t.dailyEntry.copyYesterdayMealsLabel}
          </Button>
          {isCopyDayDialogOpen && (
            <CopyDayMealsDialog
              open={isCopyDayDialogOpen}
              onOpenChange={setIsCopyDayDialogOpen}
              mealGroups={previousDayMealGroups}
              onConfirm={(selected) => {
                copyDaySelectedGroups(selected)
                setIsCopyDayDialogOpen(false)
              }}
            />
          )}
        </>
      )}

      {/* Hidden entirely in the dedicated single-meal edit route (#157) —
       * that screen is meant to focus on the one meal it opened for, not
       * also offer to start a completely different one. */}
      {!focusMealId && (isAddRowCollapsed ? (
        // #199: "done for today" collapses the whole row behind one small
        // link rather than removing the ability to add more — tapping it
        // just re-expands the full row below.
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() => setIsAddRowCollapsed(false)}
        >
          {t.dailyEntry.expandAddMealLabel}
        </Button>
      ) : (
      <div
        // Card treatment (#143), same as every other meal group's <li>
        // above — its own visible boundary now does the job the old
        // border-t divider (#95) used to, so that's dropped rather than
        // doubling up on separators. defaultMealLabel(n) (#141) is the
        // same default name existing unlabeled groups show, so this row
        // previews what the new meal will get: Breakfast/Lunch/Dinner/
        // Snack for the first 4, "Meal N" from the 5th on.
        className="flex flex-col gap-1.5 rounded-xl bg-card p-3 ring-1 ring-foreground/10"
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
        {/* #190: only rendered when the day before has a meal at this
         * exact position — the quick action this row exists for. Placed
         * above "Find food" since it's the fastest path when available. */}
        {previousMeal && (
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-12 w-full text-base"
            onClick={() => setIsRepeatDialogOpen(true)}
          >
            {t.dailyEntry.repeatMealLabel(
              effectiveMealLabel(
                t,
                calorieEntries.length + 1,
                previousMeal.label,
              ),
            )}
          </Button>
        )}
        {isRepeatDialogOpen && previousMeal && (
          <RepeatMealDialog
            open={isRepeatDialogOpen}
            onOpenChange={setIsRepeatDialogOpen}
            mealLabel={effectiveMealLabel(
              t,
              calorieEntries.length + 1,
              previousMeal.label,
            )}
            items={previousMeal.items}
            onConfirm={(selected) => {
              repeatSelectedItems(selected)
              setIsRepeatDialogOpen(false)
            }}
          />
        )}
        {/* #153: "Find food" is now the primary, full-width CTA — search
         * first, and only fall back to typing macros by hand if the dish
         * isn't found. Was the other way around (manual entry first,
         * "Find food" a same-weight afterthought below it, #106), which
         * both buried the lower-friction path and meant more free-typed
         * names ending up inconsistent with the curated catalog. */}
        <Button
          type="button"
          size="lg"
          className="h-12 w-full text-base"
          onClick={() => setIsFoodPickerOpen(true)}
        >
          {t.dailyEntry.addFoodButton}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          {t.dailyEntry.orDivider}
        </p>
        {/* Item fields (name, mode, kcal, macros) moved into a
         * full-screen editor sheet (#122) — this trigger shows a compact
         * preview once something's staged, same as an editItems row.
         * #153: shrunk from a full-width h-12 row to a small link — now the
         * fallback when the dish isn't in Find food's results, not the
         * first thing offered. */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="justify-start"
            onClick={() => setIsAddItemSheetOpen(true)}
          >
            {addAmountPreview && addAmountPreview > 0 ? (
              <span className="truncate">
                {addItemName || t.dailyEntry.itemNamePlaceholder}
                {addItemBrand && ` (${addItemBrand})`}
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
          {/* Clear button (#151) — before this, a staged item draft with
           * nothing the user wants could only be discarded by reopening
           * the sheet and erasing every field by hand. */}
          {addAmountPreview !== undefined && addAmountPreview > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t.dailyEntry.clearItemDraftLabel}
              onClick={resetItemDraft}
            >
              <X aria-hidden="true" className="size-3.5" />
            </Button>
          )}
        </div>
        <MealItemEditorSheet
          open={isAddItemSheetOpen}
          onOpenChange={setIsAddItemSheetOpen}
          title={t.dailyEntry.addItemSheetTitle}
          name={addItemName}
          onNameChange={setAddItemName}
          brand={addItemBrand}
          onBrandChange={setAddItemBrand}
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
          todayTotalPreview={todayTotalPreview ?? undefined}
          onSave={() => {
            addMeal()
            setIsAddItemSheetOpen(false)
          }}
          onSaveAndAddAnother={stageAddItem}
        />
        {/* #153: moved below both add-item CTAs — previously sandwiched
         * between "+ Add item" and "Find food", interrupting the scan path
         * between the two ways to add a dish. */}
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
        {/* Lazily mounted (#78) — the food list grew to 300+ items, and
         * rendering it unconditionally meant every render paid that cost
         * even with the dialog closed. Only mounting it while open keeps
         * the closed (overwhelmingly common) case cheap. */}
        {isFoodPickerOpen && (
          <FoodPickerDialog
            open={isFoodPickerOpen}
            onOpenChange={setIsFoodPickerOpen}
            onAdd={addFoodEntry}
            mealItems={mealItems}
          />
        )}
        {/* #199: collapses this whole row for the rest of today once
         * nothing more is planned — see expandAddMealLabel above for the
         * way back. */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() => setIsAddRowCollapsed(true)}
        >
          {t.dailyEntry.collapseAddMealLabel}
        </Button>
      </div>
      ))}
    </div>
  )
}
