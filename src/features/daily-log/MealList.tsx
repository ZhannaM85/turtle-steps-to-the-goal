import { useEffect, useMemo, useRef, useState } from 'react'
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
import { GripVertical, Pencil, ScanBarcode, Trash2, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { foods } from '@/data/foods'
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
import { fastingHoursBetween } from '@/domain/stats'
import {
  formatNumber,
  useLocale,
  useTranslation,
  type Dictionary,
  type Locale,
} from '@/i18n'
import {
  IndexedDbDailyEntryRepository,
  IndexedDbMealItemRepository,
} from '@/infrastructure/persistence/indexeddb'
import { useOnlineStatus } from '@/shared/hooks'
import { MEAL_EMOTIONS } from '@/shared/lib/emotionIcons'
import {
  formatMacroGrams,
  macrosSummaryText,
  macrosSummaryTextCompact,
} from '@/shared/lib/macroDisplay'
import {
  formatComputedTotal,
  gramsToPortions,
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
  useDayStartStore,
  useMealItemStore,
  useMealLabelPresetStore,
} from '@/stores'
import { AddMealDialog } from './AddMealDialog'
import { BarcodeScannerDialog } from './BarcodeScannerDialog'
import { CopyDayMealsDialog } from './CopyDayMealsDialog'
import { FoodPickerDialog, type PickedFoodValues } from './FoodPickerDialog'
import { lookupBarcode } from './lookupBarcode'
import { MealItemEditorSheet } from './MealItemEditorSheet'

// Every curated food's name in either locale (#150) — names an item picked
// via FoodPickerDialog can carry, distinct from a name the user actually
// typed themselves. `foods.ts` is static, so this only needs computing once
// rather than per-render or per-save.
const curatedFoodNames = new Set(foods.flatMap((food) => [food.en, food.ru]))

// #190: own repository instance, same no-shared-store pattern as
// MealEditScreen/useHistoryData/useDashboardData — fetches the day
// *before* `date` to power the "Repeat yesterday's [meal]" quick action.
const dailyEntryRepository = new IndexedDbDailyEntryRepository()
// #256: a plain repository instance (not routed through useMealItemStore)
// for the one-shot local-barcode-match check a scan performs — read-only,
// no reactivity needed the way the store's own `items` list has.
const mealItemRepositoryForBarcodeLookup = new IndexedDbMealItemRepository()

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
  /** Dietary fiber in grams (#341) — same optional/additive shape as the
   * three macros above. */
  fiber: string
  /** Per-dish free-text note (#344) — see CalorieItem.noteText. */
  note: string
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
  /** #279 — not a CalorieItem field (favorite belongs to the reusable
   * MealItem/FoodOverride, not one day's logged instance); read only at
   * save time to pass into `useMealItemStore.touch`'s favorite argument.
   * Always starts false when opening an existing item's editor (#276's
   * food-picker star or Settings' own list are the source of truth for
   * an existing dish's actual favorite status). */
  favorite: boolean
  /** #256 — set when this draft was filled in (fully or partially) from a
   * barcode scan, so the resulting MealItem can be found instantly next
   * time without a repeat Open Food Facts fetch. Same "not a CalorieItem
   * field, read only at save time" reasoning as favorite above. */
  barcode: string | undefined
}

function itemDraftFrom(item: CalorieItem): EditItemDraft {
  const rates = ratesFromAbsolute(
    item.amountKcal,
    item.proteinG,
    item.fatG,
    item.carbsG,
    item.amountG,
    item.fiberG,
  )
  return {
    id: item.id,
    name: item.name ?? '',
    brand: item.brand ?? '',
    amount: String(rates.kcal100),
    protein: rates.protein100 === undefined ? '' : String(rates.protein100),
    fat: rates.fat100 === undefined ? '' : String(rates.fat100),
    carbs: rates.carbs100 === undefined ? '' : String(rates.carbs100),
    fiber: rates.fiber100 === undefined ? '' : String(rates.fiber100),
    // #344 — deliberately not restored from the picked MealItem suggestion
    // the way the nutrition fields above are; a note is situational to
    // *this* logging, not a stable fact about the dish, same as
    // emotion/favorite always starting blank too.
    note: item.noteText ?? '',
    amountG: String(rates.portions),
    macroMode: 'per100g',
    emotion: item.emotion,
    favorite: false,
    barcode: undefined,
  }
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
    fiber: '',
    note: '',
    amountG: '1',
    macroMode: 'per100g',
    emotion: undefined,
    favorite: false,
    barcode: undefined,
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
            parseOptionalMacro(draft.fiber),
          )
        : totalFromPortion(
            amountNum,
            parseOptionalMacro(draft.protein),
            parseOptionalMacro(draft.fat),
            parseOptionalMacro(draft.carbs),
            draft.amountG,
            parseOptionalMacro(draft.fiber),
          )
    return [
      {
        id: draft.id,
        name: draft.name.trim() || undefined,
        brand: draft.brand.trim() || undefined,
        ...scaled,
        emotion: draft.emotion,
        noteText: draft.note.trim() || undefined,
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
    field:
      | 'name'
      | 'brand'
      | 'amount'
      | 'protein'
      | 'fat'
      | 'carbs'
      | 'fiber'
      | 'note'
      | 'amountG',
    value: string,
  ) => void
  onEditItemSelectMealItem: (id: string, item: MealItem) => void
  onEditItemModeChange: (id: string, mode: 'per100g' | 'perPortion') => void
  // Per-dish reaction (#129) — moved from meal-group level.
  onEditItemEmotionChange: (id: string, emotion: MealEmotion | undefined) => void
  // Per-dish favorite (#279) — same shape as the emotion handler above.
  onEditItemFavoriteChange: (id: string, favorite: boolean) => void
  /** Returns the new draft's id (#122) so the caller can open its editor
   * sheet immediately. */
  onAddEditItem: () => string
  /** #288 — same local-first/Open-Food-Facts lookup as the bottom add
   * row's own scan handler, but always creates a brand new draft (returned
   * id) rather than mutating an existing row; `notFound` tells the caller
   * whether to show the quiet "no food found" message. */
  onScanBarcode: (barcode: string) => Promise<{ id: string; notFound: boolean }>
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
  onEditItemFavoriteChange,
  onAddEditItem,
  onScanBarcode,
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
  // #288 — same "own local state, not lifted higher" reasoning as
  // isFoodPickerOpen above.
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false)
  const [barcodeNotFoundMessage, setBarcodeNotFoundMessage] = useState(false)

  async function handleBarcodeScanned(barcode: string) {
    const { id, notFound } = await onScanBarcode(barcode)
    setBarcodeNotFoundMessage(notFound)
    onOpenEditItem(id)
  }
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
        {/* #288 — same fallback tier as the bottom add-row's own scan
         * button (#256): search first, scan or type by hand otherwise. */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="justify-start"
          aria-label={`${t.dailyEntry.scanBarcodeButton} — ${t.dailyEntry.mealLabel(position)}`}
          onClick={() => setIsBarcodeScannerOpen(true)}
        >
          <ScanBarcode aria-hidden="true" />
          {t.dailyEntry.scanBarcodeButton}
        </Button>
        {isFoodPickerOpen && (
          <FoodPickerDialog
            open={isFoodPickerOpen}
            onOpenChange={setIsFoodPickerOpen}
            onAdd={onAddFood}
            mealItems={mealItems}
          />
        )}
        {isBarcodeScannerOpen && (
          <BarcodeScannerDialog
            open={isBarcodeScannerOpen}
            onOpenChange={setIsBarcodeScannerOpen}
            onScanned={handleBarcodeScanned}
          />
        )}
        {openDraft && (
          <MealItemEditorSheet
            open
            onOpenChange={(open) => {
              if (!open) {
                // #300: a barcode scan auto-populates a brand-new draft
                // with whatever it found, before the user has confirmed
                // they actually want it added to the meal — closing via
                // the sheet's own X (or Escape/backdrop, all funneled
                // through this same onOpenChange) reads as "no, don't add
                // this," unlike "+ Add item"'s blank draft (which already
                // silently drops out at save time regardless, since it
                // has no valid amount). Only a still-new, scanned draft
                // needs discarding here — an existing item being edited,
                // or a new one the user already confirmed via Save (or
                // "Save and add one more") earlier this session, is
                // untouched: neither of those routes through this
                // onOpenChange at all.
                if (isOpenDraftNew && openDraft.barcode !== undefined) {
                  onRemoveEditItem(openDraft.id)
                } else {
                  onOpenEditItem(null)
                }
                setBarcodeNotFoundMessage(false)
              }
            }}
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
            fiber={openDraft.fiber}
            onFiberChange={(value) =>
              onEditItemFieldChange(openDraft.id, 'fiber', value)
            }
            note={openDraft.note}
            onNoteChange={(value) =>
              onEditItemFieldChange(openDraft.id, 'note', value)
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
            favorite={openDraft.favorite}
            onFavoriteChange={(favorite) =>
              onEditItemFavoriteChange(openDraft.id, favorite)
            }
            onSave={() => onOpenEditItem(null)}
            onSaveAndAddAnother={
              isOpenDraftNew
                ? () => onOpenEditItem(onAddEditItem())
                : undefined
            }
            infoMessage={
              barcodeNotFoundMessage
                ? t.dailyEntry.noFoodFoundForBarcodeMessage
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
        'flex flex-col gap-2 rounded-xl bg-card p-4 ring-1 ring-foreground/10',
        isDragging && 'opacity-50',
      )}
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-lg font-medium">
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
        <p className="text-base text-muted-foreground">{entry.note}</p>
      )}
      {macrosSummary && (
        <p className="text-base text-muted-foreground">{macrosSummary}</p>
      )}
      {/* Item sub-list (#81) — a group's individual dishes, shown
       * underneath its own header/note/macro-total lines above. */}
      <ul className="flex flex-col divide-y divide-foreground/15 pl-4">
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
            <li
              key={item.id}
              className="py-2 text-xl text-muted-foreground first:pt-0 last:pb-0"
            >
              {/* #302: the title stands alone on its own row — kcal/amount/
               * macros/reaction all move down to a second row together,
               * rather than the title running inline into whatever
               * followed it. */}
              {item.name && (
                <p>
                  {item.name}
                  {item.brand ? ` (${item.brand})` : ''}
                </p>
              )}
              <p>
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
              </p>
              {/* Own row, split from kcal/amount above (#462 follow-up) —
               * at the bigger #464 font size, kcal+amount+macros+reaction
               * all on one line wrapped mid-number on a phone width. */}
              {(itemMacros || itemEmotionOption) && (
                <p>
                  {itemMacros}
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
                </p>
              )}
              {/* #344 — this dish's own note, distinct from the meal
               * group's own note shown above the item list. Omitted when
               * unset, same as the other optional per-item details above. */}
              {item.noteText && <p>{item.noteText}</p>}
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
  /** #399 — the active goal's daily calorie target, when set. Threaded
   * into the add-row sheet and "Find food" dialog so the user can see how
   * many calories would be left, not just the running total, before
   * confirming an add. Omitted (no goal, or no target set) simply hides
   * that preview line — the existing running-total one is unaffected. */
  dailyCalorieTargetKcal?: number
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
  dailyCalorieTargetKcal,
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

  // #387 — reported live: a meal logged before this cutoff gets filed
  // under the *previous* day's own record (`effectiveDateFor`, #298), so
  // without this the toast's own day-pairing math would treat that
  // past-midnight meal as an early meal of that previous day instead of
  // its actual latest one. See fastingWindow.ts's own `adjustForDayStart`
  // comment for the full reasoning.
  const dayStartTime = useDayStartStore((state) => state.dayStartTime)
  // #287/#450/#456 — a quiet note shown whenever this day's first timed
  // meal and the previous day's last timed meal are both known, computed
  // as a plain derived value (not an action-triggered store, #456's own
  // "display constantly" ask) so it's automatically always correct: it
  // shows on page load if the condition already holds, recomputes live if
  // either side changes later (a save on *this* day, or `previousDayEntry`
  // resolving/updating after navigating between days — #450's own
  // retroactive-recalc case falls out of this for free), and never needs
  // an explicit dismiss/reconcile call at any save site. `useMemo` — not
  // recomputed on unrelated re-renders (opening a dialog, typing in
  // search), only when one of these actual inputs changes.
  const fastingWindowToastHours = useMemo(
    () =>
      previousDayEntry
        ? fastingHoursBetween(
            previousDayEntry,
            { calorieEntries },
            dayStartTime,
          )
        : null,
    [previousDayEntry, calorieEntries, dayStartTime],
  )

  const isOnline = useOnlineStatus()
  // #253: whole-day sibling of the above — CopyDayMealsDialog's own
  // preview/selective-pick sheet, extended over every meal group in the
  // source day instead of just the one at this position.
  const [isCopyDayDialogOpen, setIsCopyDayDialogOpen] = useState(false)
  // #454 — the whole "add a meal" flyout, replacing the old inline
  // accordion (isAddRowCollapsed/the add-row's own draft-field cluster).
  // `inProgressMealId` tracks which CalorieEntry the flyout is currently
  // building: null until the *first* item this session is actually added,
  // at which point a new entry is created and every subsequent add (search
  // pick, barcode scan, Repeat, recipe, manual entry) appends to that same
  // entry instead of creating a new one — the flyout stays open across
  // several single-dish adds (resolved via `AskUserQuestion`) rather than
  // closing after each one. `newMealPosition`/`newMealPreviousMeal` are
  // captured once at the moment the flyout opens (openAddMealDialog below),
  // not recomputed reactively — `calorieEntries.length` grows the instant
  // the first item lands, which would otherwise drift `previousMeal`
  // (keyed by position) to the *next* slot mid-session.
  const [isAddMealDialogOpen, setIsAddMealDialogOpen] = useState(false)
  const [inProgressMealId, setInProgressMealId] = useState<string | null>(null)
  const [newMealTime, setNewMealTime] = useState(currentTimeHHMM())
  const [newMealNote, setNewMealNote] = useState('')
  const [newMealPosition, setNewMealPosition] = useState(1)
  const [newMealPreviousMeal, setNewMealPreviousMeal] = useState<
    CalorieEntry | undefined
  >(undefined)
  function openAddMealDialog() {
    setInProgressMealId(null)
    setNewMealTime(currentTimeHHMM())
    setNewMealNote('')
    setNewMealPosition(calorieEntries.length + 1)
    setNewMealPreviousMeal(previousDayEntry?.calorieEntries?.[calorieEntries.length])
    setIsAddMealDialogOpen(true)
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

  // #454 — the in-progress meal `AddMealDialog` is currently building, if
  // any (see inProgressMealId's own comment above for why the flyout stays
  // open across several adds instead of closing after each one).
  const inProgressMeal = calorieEntries.find(
    (entry) => entry.id === inProgressMealId,
  )

  // Appends one or more items to the in-progress meal, creating it (a
  // fresh CalorieEntry) on the *first* call this session and appending to
  // that same entry's `items` on every subsequent call — same
  // replace-items-for-this-id shape saveEditMeal() below already uses for
  // an existing meal's own edit-mode Save, just applied to a freshly
  // created id instead of a previously-saved one. `AddMealDialog` itself
  // already handles touchMealItem for whichever of search/barcode/manual
  // entry/Repeat/recipe produced these items, so this only owns the
  // day's own `calorieEntries` array and the fasting-toast checks every
  // other add path already runs.
  function appendItemsToNewMeal(newItems: CalorieItem[]) {
    if (newItems.length === 0) return
    let nextEntries: CalorieEntry[]
    if (
      inProgressMealId &&
      calorieEntries.some((entry) => entry.id === inProgressMealId)
    ) {
      nextEntries = calorieEntries.map((entry) =>
        entry.id === inProgressMealId
          ? { ...entry, items: [...entry.items, ...newItems] }
          : entry,
      )
    } else {
      const newId = crypto.randomUUID()
      setInProgressMealId(newId)
      nextEntries = [
        ...calorieEntries,
        {
          id: newId,
          items: newItems,
          timeEaten: newMealTime || undefined,
          note: newMealNote.trim() || undefined,
          createdAt: new Date().toISOString(),
        },
      ]
    }
    setCalorieEntries(nextEntries)
  }

  // #459 — lets the flyout's own "meal so far" list edit a mistakenly
  // mis-entered item in place, rather than deleting and re-adding it.
  function updateItemInNewMeal(updatedItem: CalorieItem) {
    if (!inProgressMealId) return
    setCalorieEntries(
      calorieEntries.map((entry) =>
        entry.id === inProgressMealId
          ? {
              ...entry,
              items: entry.items.map((item) =>
                item.id === updatedItem.id ? updatedItem : item,
              ),
            }
          : entry,
      ),
    )
  }

  // Lets the flyout's own "meal so far" list drop a mistakenly-added item
  // without leaving the dialog — same "a group with its last item removed
  // is itself removed" invariant CalorieEntry.items documents.
  function removeItemFromNewMeal(itemId: string) {
    if (!inProgressMealId) return
    setCalorieEntries(
      calorieEntries
        .map((entry) =>
          entry.id === inProgressMealId
            ? { ...entry, items: entry.items.filter((item) => item.id !== itemId) }
            : entry,
        )
        .filter((entry) => entry.id !== inProgressMealId || entry.items.length > 0),
    )
  }

  // #454 — the new whole-meal "was it tasty?" reaction, set from the
  // flyout's own footer once at least one item has been added.
  function setNewMealReaction(reaction: Emotion | undefined) {
    if (!inProgressMealId) return
    setCalorieEntries(
      calorieEntries.map((entry) =>
        entry.id === inProgressMealId ? { ...entry, reaction } : entry,
      ),
    )
  }

  // Time/note are editable in the flyout both *before* the first item lands
  // (where they're just seed values for appendItemsToNewMeal's own
  // entry-creation branch above) and *after*, once the entry already
  // exists — without also writing through to the live entry here, a change
  // made post-creation would only ever update the input's own display, not
  // the actually-saved CalorieEntry.
  function updateNewMealTime(value: string) {
    setNewMealTime(value)
    if (!inProgressMealId) return
    setCalorieEntries(
      calorieEntries.map((entry) =>
        entry.id === inProgressMealId
          ? { ...entry, timeEaten: value || undefined }
          : entry,
      ),
    )
  }
  function updateNewMealNote(value: string) {
    setNewMealNote(value)
    if (!inProgressMealId) return
    setCalorieEntries(
      calorieEntries.map((entry) =>
        entry.id === inProgressMealId
          ? { ...entry, note: value.trim() || undefined }
          : entry,
      ),
    )
  }

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
            fiberG: item.fiberG,
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
        value.fiberG,
      )
      return {
        id: crypto.randomUUID(),
        name: value.note,
        brand: '',
        amount: String(rates.kcal100),
        protein: rates.protein100 === undefined ? '' : String(rates.protein100),
        fat: rates.fat100 === undefined ? '' : String(rates.fat100),
        carbs: rates.carbs100 === undefined ? '' : String(rates.carbs100),
        fiber: rates.fiber100 === undefined ? '' : String(rates.fiber100),
        note: '',
        amountG: String(rates.portions),
        macroMode: 'per100g',
        emotion: value.emotion,
        favorite: false,
        barcode: undefined,
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
    field:
      | 'name'
      | 'brand'
      | 'amount'
      | 'protein'
      | 'fat'
      | 'carbs'
      | 'fiber'
      | 'note'
      | 'amountG',
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

  // #279 — same shape as updateEditItemEmotion above.
  function updateEditItemFavorite(id: string, favorite: boolean) {
    setEditItems((items) =>
      items.map((item) => (item.id === id ? { ...item, favorite } : item)),
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
        // #457 — the weight/portions field's own *unit* changes between
        // modes (a portions count in per-100g mode, e.g. "0.5" meaning
        // 50g; real grams in Portion mode) independently of whether an
        // amount/macros have been typed yet — converting it can't live
        // behind the "nothing to convert" guard below, or setting the
        // weight *before* the amount (a completely normal order) would
        // switch modes without ever converting it, leaving a number in
        // the wrong unit for whichever mode comes next.
        const convertedAmountG =
          newMode === 'perPortion'
            ? String(portionsToGrams(draft.amountG) ?? '')
            : String(gramsToPortions(draft.amountG))
        const amountNum = parseNumberInput(draft.amount)
        if (!amountNum || amountNum <= 0) {
          return { ...draft, amountG: convertedAmountG, macroMode: newMode }
        }
        if (newMode === 'perPortion') {
          const scaled = scaleFromPer100g(
            amountNum,
            parseOptionalMacro(draft.protein),
            parseOptionalMacro(draft.fat),
            parseOptionalMacro(draft.carbs),
            draft.amountG,
            parseOptionalMacro(draft.fiber),
          )
          return {
            ...draft,
            amount: String(scaled.amountKcal),
            protein:
              scaled.proteinG === undefined ? '' : String(scaled.proteinG),
            fat: scaled.fatG === undefined ? '' : String(scaled.fatG),
            carbs: scaled.carbsG === undefined ? '' : String(scaled.carbsG),
            fiber: scaled.fiberG === undefined ? '' : String(scaled.fiberG),
            amountG: convertedAmountG,
            macroMode: newMode,
          }
        }
        const rates = ratesFromAbsolute(
          amountNum,
          parseOptionalMacro(draft.protein),
          parseOptionalMacro(draft.fat),
          parseOptionalMacro(draft.carbs),
          // #457 — draft.amountG is already real grams here (Portion
          // mode's own field, not a portions count) — used directly, not
          // through portionsToGrams (which would wrongly multiply it by
          // 100 again).
          parseOptionalMacro(draft.amountG),
          parseOptionalMacro(draft.fiber),
        )
        return {
          ...draft,
          amount: String(rates.kcal100),
          protein:
            rates.protein100 === undefined ? '' : String(rates.protein100),
          fat: rates.fat100 === undefined ? '' : String(rates.fat100),
          carbs: rates.carbs100 === undefined ? '' : String(rates.carbs100),
          fiber: rates.fiber100 === undefined ? '' : String(rates.fiber100),
          amountG: convertedAmountG,
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
      item.lastFiberG,
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
              fiber: rates.fiber100 === undefined ? '' : String(rates.fiber100),
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

  // #288 — the edit-meal counterpart to handleBarcodeScanned above (the
  // bottom add-row's own scan handler): same local-first/Open-Food-Facts
  // lookup, but since there's no single "current draft" being typed into
  // here (unlike the add row's own fields), a scan always creates a brand
  // new blank-or-prefilled draft — same "scanning always adds a new item,
  // never edits an existing one" shape #256 already established — rather
  // than mutating an existing row. Returns the new draft's id (so the
  // caller can open its editor sheet, same as addEditItem above) and
  // whether nothing matched anywhere, so the caller can surface the same
  // quiet "no food found" message the add row shows.
  async function scanBarcodeIntoEditItems(
    barcode: string,
  ): Promise<{ id: string; notFound: boolean }> {
    const result = await lookupBarcode(
      barcode,
      mealItemRepositoryForBarcodeLookup,
      isOnline,
    )
    const draft = blankItemDraft()
    if (result.source === 'local') {
      draft.name = result.item.name
      draft.barcode = result.item.barcode
      if (result.item.lastAmountKcal !== undefined) {
        const rates = ratesFromAbsolute(
          result.item.lastAmountKcal,
          result.item.lastProteinG,
          result.item.lastFatG,
          result.item.lastCarbsG,
          result.item.lastAmountG,
        )
        draft.amount = String(rates.kcal100)
        draft.protein = rates.protein100 === undefined ? '' : String(rates.protein100)
        draft.fat = rates.fat100 === undefined ? '' : String(rates.fat100)
        draft.carbs = rates.carbs100 === undefined ? '' : String(rates.carbs100)
        draft.amountG = String(rates.portions)
      }
    } else if (result.source === 'openFoodFacts') {
      draft.name = result.name
      draft.brand = result.brand ?? ''
      draft.amount = String(result.kcal100)
      draft.protein = result.protein100 === undefined ? '' : String(result.protein100)
      draft.fat = result.fat100 === undefined ? '' : String(result.fat100)
      draft.carbs = result.carbs100 === undefined ? '' : String(result.carbs100)
      draft.barcode = barcode
    } else {
      draft.barcode = barcode
    }
    setEditItems((items) => [...items, draft])
    return { id: draft.id, notFound: result.source === 'none' }
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
    // #279 — see addMeal()'s identical map: only ever forces true, since
    // itemDraftFrom always seeds an existing item's draft with favorite:
    // false regardless of its real stored status.
    const favoriteById = new Map(
      editItems.map((draft) => [draft.id, draft.favorite || undefined]),
    )
    // #256 — same "look up by draft id" reasoning as favoriteById above.
    const barcodeById = new Map(
      editItems.map((draft) => [draft.id, draft.barcode]),
    )
    if (items.length === 0) {
      setCalorieEntries(
        calorieEntries.filter((entry) => entry.id !== editingMealId),
      )
      setEditingMealId(null)
      setOpenEditItemId(null)
      return
    }
    const nextEntries = calorieEntries.map((entry) =>
      entry.id === editingMealId
        ? {
            ...entry,
            items,
            label: editGroupLabel.trim() || undefined,
            note: editGroupNote.trim() || undefined,
            timeEaten: editGroupTime || undefined,
          }
        : entry,
    )
    setCalorieEntries(nextEntries)
    for (const item of items) {
      // Skip names that are actually a curated food, picked via
      // FoodPickerDialog rather than typed by hand (#150) — otherwise
      // saving any edit to a meal containing one leaks it into the
      // personal dictionary, which addFoodEntry() already correctly
      // avoids doing on the initial add.
      if (item.name && !curatedFoodNames.has(item.name)) {
        touchMealItem(
          item.name,
          {
            amountKcal: item.amountKcal,
            proteinG: item.proteinG,
            fatG: item.fatG,
            carbsG: item.carbsG,
            fiberG: item.fiberG,
            amountG: item.amountG,
          },
          favoriteById.get(item.id),
          barcodeById.get(item.id),
        )
      }
    }
    setEditingMealId(null)
    setOpenEditItemId(null)
  }

  function confirmDeleteMeal() {
    const nextEntries = calorieEntries.filter(
      (entry) => entry.id !== confirmDeleteMealId,
    )
    setCalorieEntries(nextEntries)
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

  return (
    <div className="flex flex-col gap-3">
      {fastingWindowToastHours !== null && (
        // #456 — purely derived (see the useMemo above), so this note is
        // always accurate for whatever's currently on screen and has no
        // dismiss control of its own to go stale.
        <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground">
          <span>
            {t.dailyEntry.fastingWindowToastMessage(
              `${formatNumber(fastingWindowToastHours, locale, 1)}${t.dailyEntry.hoursUnit}`,
            )}
          </span>
        </div>
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
                  onEditItemFavoriteChange={updateEditItemFavorite}
                  onAddEditItem={addEditItem}
                  onScanBarcode={scanBarcodeIntoEditItems}
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
       * also offer to start a completely different one. #454 — this used
       * to be an inline accordion (a collapse/expand toggle behind a whole
       * card of triggers); now it's a single trigger opening a dedicated
       * full-screen flyout instead. */}
      {!focusMealId && (
        <>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-12 w-full text-base"
            onClick={openAddMealDialog}
          >
            {t.dailyEntry.expandAddMealLabel}
          </Button>
          {isAddMealDialogOpen && (
            <AddMealDialog
              open={isAddMealDialogOpen}
              onOpenChange={setIsAddMealDialogOpen}
              mealLabel={effectiveMealLabel(
                t,
                newMealPosition,
                inProgressMeal?.label ?? newMealPreviousMeal?.label,
              )}
              timeEaten={newMealTime}
              onTimeEatenChange={updateNewMealTime}
              note={newMealNote}
              onNoteChange={updateNewMealNote}
              previousMeal={newMealPreviousMeal}
              items={inProgressMeal?.items ?? []}
              reaction={inProgressMeal?.reaction}
              onReactionChange={setNewMealReaction}
              onAppendItems={appendItemsToNewMeal}
              onRemoveItem={removeItemFromNewMeal}
              onUpdateItem={updateItemInNewMeal}
              todayTotals={{
                kcal: totalCalories(calorieEntries) ?? 0,
                proteinG: totalProtein(calorieEntries) ?? 0,
                fatG: totalFat(calorieEntries) ?? 0,
                carbsG: totalCarbs(calorieEntries) ?? 0,
              }}
              dailyCalorieTargetKcal={dailyCalorieTargetKcal}
            />
          )}
        </>
      )}
    </div>
  )
}
