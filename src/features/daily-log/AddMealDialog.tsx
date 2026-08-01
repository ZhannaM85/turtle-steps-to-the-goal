import { useEffect, useState } from 'react'
import {
  ChefHat,
  type LucideIcon,
  Pencil,
  ScanBarcode,
  Star,
  Trash2,
  Utensils,
  X,
} from 'lucide-react'
import { type FoodItem, type FoodServing, foods } from '@/data/foods'
import type { CalorieItem, Emotion, MealEmotion } from '@/domain/dailyEntry'
import type { MealItem } from '@/domain/mealItem'
import { formatNumber, useLocale, useTranslation } from '@/i18n'
import { applyFoodOverrides } from '@/shared/lib/applyFoodOverrides'
import { DAY_EMOTIONS, MEAL_EMOTIONS } from '@/shared/lib/emotionIcons'
import { formatKcal, macrosSummaryTextCompact } from '@/shared/lib/macroDisplay'
import {
  gramsToPortions,
  parseOptionalMacro,
  portionsToGrams,
  ratesFromAbsolute,
  scaleFromPer100g,
  totalFromPortion,
} from '@/shared/lib/macroScaling'
import { parseNumberInput } from '@/shared/lib/parseNumberInput'
import { rankBySearchMatch } from '@/shared/lib/searchRank'
import { cn } from '@/shared/lib/utils'
import { useOnlineStatus } from '@/shared/hooks'
import {
  useFoodOverrideStore,
  useMealItemStore,
  useRecipeStore,
} from '@/stores'
import { IndexedDbMealItemRepository } from '@/infrastructure/persistence/indexeddb'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { LogRecipeDialog } from '@/features/recipes'
import { BarcodeScannerDialog } from './BarcodeScannerDialog'
import { EmotionPicker } from './EmotionPicker'
import type { PickedFoodValues } from './FoodPickerDialog'
import { lookupBarcode } from './lookupBarcode'
import { MealItemEditorSheet } from './MealItemEditorSheet'
import { RepeatMealDialog } from './RepeatMealDialog'

// #256 — same "own repository instance, no shared store" pattern
// MealList.tsx's own barcode-lookup instance already uses (read-only,
// one-shot, no reactivity needed the way useMealItemStore's own `items`
// list has).
const mealItemRepositoryForBarcodeLookup = new IndexedDbMealItemRepository()

// Every curated food's name in either locale — mirrors MealList.tsx's own
// curatedFoodNames, needed here too since manual-entry/recipe-log items
// route through the same onAppendItems callback MealList uses to decide
// whether to touch the personal food-name library.
const curatedFoodNames = new Set(foods.flatMap((food) => [food.en, food.ru]))

type PickableItem =
  | { source: 'food'; food: FoodItem }
  | { source: 'mealItem'; mealItem: MealItem & { lastAmountKcal: number } }

function itemKey(item: PickableItem): string {
  return item.source === 'food' ? `food-${item.food.id}` : `meal-${item.mealItem.id}`
}

// #264 — a curated food has no "last used" quantity of its own, so 100g
// (its per-100g reference amount) is the sensible default; a personal item
// defaults to its own last-logged amount. Same logic as FoodPickerDialog's
// own defaultQuantityFor — duplicated rather than shared, since sharing it
// would mean threading FoodPickerDialog's other component-scoped state
// through as parameters too, for one small pure function; FoodPickerDialog
// itself is untouched (it's still the "Find food" flow for editing an
// already-existing meal, out of #454's scope).
function defaultQuantityFor(item: PickableItem): string {
  if (item.source === 'mealItem' && item.mealItem.lastAmountG !== undefined) {
    return String(item.mealItem.lastAmountG)
  }
  return '100'
}

function blankManualDraft() {
  return {
    name: '',
    brand: '',
    amount: '',
    protein: '',
    fat: '',
    carbs: '',
    fiber: '',
    note: '',
    amountG: '1',
    macroMode: 'per100g' as 'per100g' | 'perPortion',
    emotion: undefined as MealEmotion | undefined,
    favorite: false,
  }
}

export interface AddMealDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Position-derived default, or the previous meal's own custom label —
   * computed by `MealList.tsx` exactly as it already does for the heading
   * above the old add-row (`effectiveMealLabel`/`defaultMealLabel`). */
  mealLabel: string
  /** #459 — the meal's 1-based position within the day, needed only for
   * the whole-meal delete button's aria-label (`deleteMealLabel(n)`).
   * Undefined (and `onDeleteMeal` absent) for the in-progress "new meal"
   * flow, which has nothing to delete yet. */
  mealPosition?: number
  timeEaten: string
  onTimeEatenChange: (value: string) => void
  /** The whole meal's own shared note (distinct from a per-item `noteText`,
   * #454 restoring what the pre-redesign add-row already had — dropped by
   * accident during the rewrite, since the mockup this issue was based on
   * didn't show one, but it's still fully editable once a meal is already
   * saved, so a brand-new meal needs the same capability at creation time. */
  note: string
  onNoteChange: (value: string) => void
  /** Yesterday's meal at this same position, if any — powers "Repeat
   * yesterday's [meal]". Undefined hides that quick action entirely. */
  previousMeal?: { label?: string; items: CalorieItem[] }
  /** The in-progress meal's own items, live from `MealList` — this dialog
   * stays open across multiple adds (#454), so this list grows in place
   * rather than being local, uncommitted state. */
  items: CalorieItem[]
  reaction: Emotion | undefined
  onReactionChange: (reaction: Emotion | undefined) => void
  onAppendItems: (items: CalorieItem[]) => void
  onRemoveItem: (itemId: string) => void
  /** #459 — edit-in-place for an already-added item (tap its row in "This
   * meal so far"), reusing the same manual-entry sheet pre-filled with its
   * current values rather than a separate editor. Optional: both the
   * in-progress "new meal" flow and the #461 saved-meal overlay wire it. */
  onUpdateItem?: (item: CalorieItem) => void
  /** #459 — deletes the whole meal (only meaningful for an already-saved
   * meal, so only MealList's #461 edit overlay passes this — the
   * in-progress "new meal" flow leaves it undefined and the button stays
   * hidden). */
  onDeleteMeal?: () => void
  todayTotals?: {
    kcal: number
    proteinG: number
    fatG: number
    carbsG: number
  }
  dailyCalorieTargetKcal?: number
}

/**
 * #454 — the "add a meal" flow, redesigned from an inline accordion into a
 * dedicated full-screen flyout: search (with barcode scan folded into the
 * input itself) + a Recent list + Repeat/recipe/manual-entry quick actions,
 * all appending straight into the *same* in-progress meal (`items`, `date`'s
 * own `CalorieEntry` tracked by `MealList`) so the flyout can stay open
 * across several single-dish adds instead of closing after each one.
 * `FoodPickerDialog.tsx` (still used for editing an already-existing meal,
 * out of scope here) is untouched — this duplicates its ranking/quantity
 * logic rather than sharing it, a deliberate tradeoff to avoid risking a
 * regression in that still-active, more heavily-tested flow.
 */
export function AddMealDialog({
  open,
  onOpenChange,
  mealLabel,
  mealPosition,
  timeEaten,
  onTimeEatenChange,
  note,
  onNoteChange,
  previousMeal,
  items,
  reaction,
  onReactionChange,
  onAppendItems,
  onRemoveItem,
  onUpdateItem,
  onDeleteMeal,
  todayTotals,
  dailyCalorieTargetKcal,
}: AddMealDialogProps) {
  const t = useTranslation()
  const locale = useLocale()
  const isOnline = useOnlineStatus()

  const mealItems = useMealItemStore((state) => state.items)
  const touchMealItem = useMealItemStore((state) => state.touch)
  const recipes = useRecipeStore((state) => state.recipes)
  const loadRecipes = useRecipeStore((state) => state.loadRecipes)
  const foodOverrides = useFoodOverrideStore((state) => state.overrides)
  const loadFoodOverrides = useFoodOverrideStore((state) => state.loadOverrides)
  const setFoodFavorite = useFoodOverrideStore((state) => state.setFavorite)
  const toggleMealItemFavorite = useMealItemStore((state) => state.toggleFavorite)
  // This dialog is only mounted while open (lazy-mounted, same pattern
  // FoodPickerDialog/BarcodeScannerDialog already use), so both stores get
  // loaded fresh each time it opens — cheap, and simpler than threading a
  // "has this already loaded elsewhere" flag through from MealList, which
  // no longer loads either of these itself now that this dialog owns the
  // whole "add a meal" flow.
  useEffect(() => {
    loadRecipes()
    loadFoodOverrides()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [search, setSearch] = useState('')
  // The item currently being quantity-confirmed — null shows the main
  // search/recent/quick-actions view instead (#454's single-tap-then-
  // return-to-search shape, replacing FoodPickerDialog's check-many-then-
  // confirm-once model).
  const [activeItem, setActiveItem] = useState<PickableItem | null>(null)
  const [quantity, setQuantity] = useState('100')
  const [servingMode, setServingMode] = useState('grams')
  const [servingCount, setServingCount] = useState('1')
  // Per-dish reaction (#129) — unchanged concept, just entered at the same
  // confirm-quantity step a search/barcode pick already goes through.
  const [itemEmotion, setItemEmotion] = useState<MealEmotion | undefined>(
    undefined,
  )

  const [isRepeatOpen, setIsRepeatOpen] = useState(false)
  const [isRecipeOpen, setIsRecipeOpen] = useState(false)
  const [isBarcodeOpen, setIsBarcodeOpen] = useState(false)
  const [isManualOpen, setIsManualOpen] = useState(false)
  const [manualDraft, setManualDraft] = useState(blankManualDraft)
  const [barcodeNotFoundMessage, setBarcodeNotFoundMessage] = useState(false)
  // #459 — non-null while the manual-entry sheet is editing an
  // already-added item (tapped from "This meal so far") rather than
  // building a brand-new one; changes what saveManualDraft() does on Save.
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [showAllRecent, setShowAllRecent] = useState(false)
  const [isConfirmingMealDelete, setIsConfirmingMealDelete] = useState(false)

  function touchIfPersonal(item: CalorieItem) {
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

  function resetActiveItem() {
    setActiveItem(null)
    setQuantity('100')
    setServingMode('grams')
    setServingCount('1')
    setItemEmotion(undefined)
  }

  const visibleFoods = applyFoodOverrides(foods, foodOverrides)
  const allMealItems: PickableItem[] = mealItems
    .filter(
      (item): item is MealItem & { lastAmountKcal: number } =>
        item.lastAmountKcal !== undefined,
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((mealItem) => ({ source: 'mealItem', mealItem }))
  const allFoods: PickableItem[] = visibleFoods.map((food) => ({
    source: 'food',
    food,
  }))
  const allItems = [...allMealItems, ...allFoods]

  const textFor = (item: PickableItem) =>
    item.source === 'food' ? item.food[locale] : item.mealItem.name

  function isFavorite(item: PickableItem): boolean {
    if (item.source === 'mealItem') return item.mealItem.favorite === true
    return (
      foodOverrides.find((override) => override.foodId === item.food.id)
        ?.favorite === true
    )
  }
  function sortFavoritesFirst(list: PickableItem[]): PickableItem[] {
    return [...list].sort(
      (a, b) => Number(isFavorite(b)) - Number(isFavorite(a)),
    )
  }
  function handleToggleFavorite(item: PickableItem) {
    if (item.source === 'mealItem') toggleMealItemFavorite(item.mealItem.id)
    else setFoodFavorite(item.food.id, !isFavorite(item))
  }

  const query = search.trim().toLowerCase()
  // "Recent" (#454) — the personal library's own most-recently-touched
  // items, capped short, shown only while the search box is empty; typing
  // anything switches straight to ranked search across the full catalog.
  // #459 — capped at 3 by default (mockup), with a "Show all" link
  // expanding to the full list rather than a fixed larger cap.
  const RECENT_COUNT = 3
  const recentItems = showAllRecent
    ? allMealItems
    : allMealItems.slice(0, RECENT_COUNT)
  const matches = query
    ? sortFavoritesFirst(
        rankBySearchMatch(
          allItems.filter((item) => textFor(item).toLowerCase().includes(query)),
          query,
          textFor,
        ),
      )
    : []

  function activeServingFor(item: PickableItem): FoodServing | undefined {
    if (item.source !== 'food' || servingMode === 'grams') return undefined
    return item.food.servings?.[Number(servingMode)]
  }
  function gramsFor(item: PickableItem): number {
    const serving = activeServingFor(item)
    if (serving) {
      const countNum = parseNumberInput(servingCount)
      const count = countNum && countNum > 0 ? countNum : 1
      return serving.grams * count
    }
    const quantityNum = parseNumberInput(quantity)
    return quantityNum && quantityNum > 0 ? quantityNum : 100
  }
  function hasValidQuantity(item: PickableItem): boolean {
    const serving = activeServingFor(item)
    if (serving) {
      const num = parseNumberInput(servingCount)
      return num !== undefined && num > 0
    }
    const num = parseNumberInput(quantity)
    return num !== undefined && num > 0
  }
  function scaledValuesFor(item: PickableItem): Omit<PickedFoodValues, 'emotion'> {
    const grams = gramsFor(item)
    const scale = grams / 100
    if (item.source === 'food') {
      const { food } = item
      return {
        amountKcal: Math.round(food.kcal100 * scale),
        proteinG: Math.round(food.protein100 * scale * 10) / 10,
        fatG: Math.round(food.fat100 * scale * 10) / 10,
        carbsG: Math.round(food.carbs100 * scale * 10) / 10,
        fiberG:
          food.fiber100 === undefined
            ? undefined
            : Math.round(food.fiber100 * scale * 10) / 10,
        note: food[locale],
        amountG: grams,
      }
    }
    const { mealItem } = item
    const rates = ratesFromAbsolute(
      mealItem.lastAmountKcal,
      mealItem.lastProteinG,
      mealItem.lastFatG,
      mealItem.lastCarbsG,
      mealItem.lastAmountG,
      mealItem.lastFiberG,
    )
    return {
      amountKcal: Math.round(rates.kcal100 * scale),
      proteinG:
        rates.protein100 === undefined
          ? 0
          : Math.round(rates.protein100 * scale * 10) / 10,
      fatG:
        rates.fat100 === undefined
          ? 0
          : Math.round(rates.fat100 * scale * 10) / 10,
      carbsG:
        rates.carbs100 === undefined
          ? 0
          : Math.round(rates.carbs100 * scale * 10) / 10,
      fiberG:
        rates.fiber100 === undefined
          ? undefined
          : Math.round(rates.fiber100 * scale * 10) / 10,
      note: mealItem.name,
      amountG: grams,
    }
  }

  function confirmActiveItem() {
    if (!activeItem || !hasValidQuantity(activeItem)) return
    const scaled = scaledValuesFor(activeItem)
    const newItem: CalorieItem = {
      id: crypto.randomUUID(),
      name: scaled.note,
      amountKcal: scaled.amountKcal,
      proteinG: scaled.proteinG,
      fatG: scaled.fatG,
      carbsG: scaled.carbsG,
      fiberG: scaled.fiberG,
      amountG: scaled.amountG,
      emotion: itemEmotion,
    }
    onAppendItems([newItem])
    touchIfPersonal(newItem)
    setSearch('')
    resetActiveItem()
  }

  // #256 — resolves a scan straight to the same quantity-confirm step a
  // search pick uses (a scan already found a real food), rather than
  // #454's predecessor behavior of prefilling the manual-entry sheet.
  async function handleScanned(barcode: string) {
    const result = await lookupBarcode(
      barcode,
      mealItemRepositoryForBarcodeLookup,
      isOnline,
    )
    setBarcodeNotFoundMessage(false)
    if (result.source === 'local') {
      setActiveItem({
        source: 'mealItem',
        mealItem: result.item as MealItem & { lastAmountKcal: number },
      })
      setQuantity(defaultQuantityFor({ source: 'mealItem', mealItem: result.item as MealItem & { lastAmountKcal: number } }))
    } else if (result.source === 'openFoodFacts') {
      // Not a catalog/personal-library item yet — represented as a
      // one-off synthetic food so the same confirm-quantity step (which
      // only knows about PickableItem) can still handle it.
      const syntheticFood: FoodItem = {
        id: `off-${barcode}`,
        en: result.name,
        ru: result.name,
        kcal100: result.kcal100,
        protein100: result.protein100 ?? 0,
        fat100: result.fat100 ?? 0,
        carbs100: result.carbs100 ?? 0,
      }
      setActiveItem({ source: 'food', food: syntheticFood })
      setQuantity('100')
    } else {
      setBarcodeNotFoundMessage(true)
      setIsManualOpen(true)
    }
  }

  // Converts the already-typed values across the per-100g/per-portion
  // toggle (#111) instead of leaving them as-is under the new
  // interpretation — same conversion math MealList.tsx's own
  // updateEditItemMode() already uses for an existing item's edit sheet,
  // ported here since manual entry lost it in the #454 rewrite (a real
  // regression: switching modes used to recompute the total/rate, now it
  // silently didn't).
  function changeManualDraftMode(newMode: 'per100g' | 'perPortion') {
    setManualDraft((draft) => {
      if (draft.macroMode === newMode) return draft
      // #457 — the weight/portions field's own *unit* changes between
      // modes (a portions count in per-100g mode, e.g. "0.5" meaning 50g;
      // real grams in Portion mode) independently of whether an
      // amount/macros have been typed yet — converting it can't live
      // behind the "nothing to convert" guard below, or setting the
      // weight *before* the amount (a completely normal order) would
      // switch modes without ever converting it, leaving a number in the
      // wrong unit for whichever mode comes next.
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
          protein: scaled.proteinG === undefined ? '' : String(scaled.proteinG),
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
        // #457 — draft.amountG is already real grams here (Portion mode's
        // own field, not a portions count) — used directly, not through
        // portionsToGrams (which would wrongly multiply it by 100 again).
        parseOptionalMacro(draft.amountG),
        parseOptionalMacro(draft.fiber),
      )
      return {
        ...draft,
        amount: String(rates.kcal100),
        protein: rates.protein100 === undefined ? '' : String(rates.protein100),
        fat: rates.fat100 === undefined ? '' : String(rates.fat100),
        carbs: rates.carbs100 === undefined ? '' : String(rates.carbs100),
        fiber: rates.fiber100 === undefined ? '' : String(rates.fiber100),
        amountG: convertedAmountG,
        macroMode: newMode,
      }
    })
  }

  function saveManualDraft() {
    const amountNum = parseNumberInput(manualDraft.amount)
    if (!amountNum || amountNum <= 0) return
    // Same per-100g-rate-x-portions vs. typed-total-directly scaling
    // MealList.tsx's own draftsToItems() uses for the identical
    // EditItemDraft shape — manualDraft.amountG is a *portion count*
    // ('1' = 100g), not raw grams, same #140 convention every other
    // per-100g field in this app already follows.
    const scaled =
      manualDraft.macroMode === 'per100g'
        ? scaleFromPer100g(
            amountNum,
            parseOptionalMacro(manualDraft.protein),
            parseOptionalMacro(manualDraft.fat),
            parseOptionalMacro(manualDraft.carbs),
            manualDraft.amountG,
            parseOptionalMacro(manualDraft.fiber),
          )
        : totalFromPortion(
            amountNum,
            parseOptionalMacro(manualDraft.protein),
            parseOptionalMacro(manualDraft.fat),
            parseOptionalMacro(manualDraft.carbs),
            manualDraft.amountG,
            parseOptionalMacro(manualDraft.fiber),
          )
    const newItem: CalorieItem = {
      id: editingItemId ?? crypto.randomUUID(),
      name: manualDraft.name.trim() || undefined,
      brand: manualDraft.brand.trim() || undefined,
      ...scaled,
      emotion: manualDraft.emotion,
      noteText: manualDraft.note.trim() || undefined,
    }
    if (editingItemId && onUpdateItem) {
      onUpdateItem(newItem)
    } else {
      onAppendItems([newItem])
    }
    // A single touchMealItem call, not touchIfPersonal *and* this — calling
    // both raced two writes to the personal library's unique `name` index
    // for the same dish (confirmed via a real ConstraintError under test).
    if (newItem.name && !curatedFoodNames.has(newItem.name)) {
      touchMealItem(
        newItem.name,
        {
          amountKcal: newItem.amountKcal,
          proteinG: newItem.proteinG,
          fatG: newItem.fatG,
          carbsG: newItem.carbsG,
          fiberG: newItem.fiberG,
          amountG: newItem.amountG,
        },
        manualDraft.favorite || undefined,
      )
    }
    setManualDraft(blankManualDraft())
    setEditingItemId(null)
    setIsManualOpen(false)
  }

  // #459 — tapping an already-added item in "This meal so far" opens the
  // same manual-entry sheet pre-filled with its exact current values.
  // 'perPortion' mode is the direct passthrough representation (see
  // totalFromPortion) — amount/protein/fat/carbs/fiber are the item's own
  // absolute values unchanged, amountG is its own real grams — so no rate
  // math is needed to round-trip it, unlike reconstructing a per100g rate.
  function startEditItem(item: CalorieItem) {
    setEditingItemId(item.id)
    setManualDraft({
      name: item.name ?? '',
      brand: item.brand ?? '',
      amount: String(item.amountKcal),
      protein: item.proteinG === undefined ? '' : String(item.proteinG),
      fat: item.fatG === undefined ? '' : String(item.fatG),
      carbs: item.carbsG === undefined ? '' : String(item.carbsG),
      fiber: item.fiberG === undefined ? '' : String(item.fiberG),
      note: item.noteText ?? '',
      amountG: item.amountG === undefined ? '' : String(item.amountG),
      macroMode: 'perPortion',
      emotion: item.emotion,
      favorite: false,
    })
    setIsManualOpen(true)
  }

  function handleRepeatConfirm(selected: CalorieItem[]) {
    if (selected.length === 0) return
    const cloned = selected.map((item) => ({
      ...item,
      id: crypto.randomUUID(),
      emotion: undefined,
    }))
    onAppendItems(cloned)
    for (const item of cloned) touchIfPersonal(item)
    setIsRepeatOpen(false)
  }

  function handleRecipeLog(values: PickedFoodValues[]) {
    const newItems: CalorieItem[] = values.map((value) => ({
      id: crypto.randomUUID(),
      name: value.note,
      amountKcal: value.amountKcal,
      proteinG: value.proteinG,
      fatG: value.fatG,
      carbsG: value.carbsG,
      fiberG: value.fiberG,
      amountG: value.amountG,
      emotion: value.emotion,
    }))
    onAppendItems(newItems)
    setIsRecipeOpen(false)
  }

  const totalsSoFar = items.reduce(
    (sum, item) => ({
      kcal: sum.kcal + item.amountKcal,
      proteinG: sum.proteinG + (item.proteinG ?? 0),
      fatG: sum.fatG + (item.fatG ?? 0),
      carbsG: sum.carbsG + (item.carbsG ?? 0),
    }),
    { kcal: 0, proteinG: 0, fatG: 0, carbsG: 0 },
  )
  const todayTotalPreview = todayTotals
    ? t.dailyEntry.todayWouldBeLabel(
        `${formatNumber(todayTotals.kcal + totalsSoFar.kcal, locale, 0)} ${t.dailyEntry.kcalUnit}`,
        `${formatNumber(todayTotals.kcal, locale, 0)} ${t.dailyEntry.kcalUnit}`,
      )
    : null
  const todayRemainingPreview =
    todayTotals !== undefined && dailyCalorieTargetKcal !== undefined
      ? t.dailyEntry.todayRemainingWouldBeLabel(
          formatKcal(
            dailyCalorieTargetKcal - (todayTotals.kcal + totalsSoFar.kcal),
            locale,
            t,
          ),
          formatKcal(dailyCalorieTargetKcal - todayTotals.kcal, locale, t),
        )
      : null

  // #273/#278 — the confirm-quantity step's own "Today would be" preview,
  // restored after being dropped in the #454 rewrite: FoodPickerDialog's
  // old checked-but-not-yet-added state showed this (kcal *and* macros,
  // #278), and this step is the direct replacement for that flow for a
  // catalog/personal-library pick. Includes the active item's own
  // prospective scaled values, on top of whatever's already confirmed.
  const activeScaled = activeItem ? scaledValuesFor(activeItem) : null
  const activeTodayTotalPreview =
    activeScaled && todayTotals
      ? t.dailyEntry.todayWouldBeLabel(
          `${formatNumber(todayTotals.kcal + totalsSoFar.kcal + activeScaled.amountKcal, locale, 0)} ${t.dailyEntry.kcalUnit} · ${macrosSummaryTextCompact(
            todayTotals.proteinG + totalsSoFar.proteinG + (activeScaled.proteinG ?? 0),
            todayTotals.fatG + totalsSoFar.fatG + (activeScaled.fatG ?? 0),
            todayTotals.carbsG + totalsSoFar.carbsG + (activeScaled.carbsG ?? 0),
            locale,
            t,
          )}`,
          `${formatNumber(todayTotals.kcal, locale, 0)} ${t.dailyEntry.kcalUnit} · ${macrosSummaryTextCompact(
            todayTotals.proteinG,
            todayTotals.fatG,
            todayTotals.carbsG,
            locale,
            t,
          )}`,
        )
      : null
  const activeTodayRemainingPreview =
    activeScaled && todayTotals !== undefined && dailyCalorieTargetKcal !== undefined
      ? t.dailyEntry.todayRemainingWouldBeLabel(
          formatKcal(
            dailyCalorieTargetKcal -
              (todayTotals.kcal + totalsSoFar.kcal + activeScaled.amountKcal),
            locale,
            t,
          ),
          formatKcal(dailyCalorieTargetKcal - todayTotals.kcal, locale, t),
        )
      : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="fullscreen"
        closeLabel={t.dailyEntry.closeFoodDialogLabel}
        // #459 sticky footer — confirmed live via devtools that the real
        // bleed-through cause was DialogContent's own bottom safe-area
        // padding: `sticky bottom-0` sticks to the *padding* edge of the
        // scrolling container, so that padding strip stayed below the
        // stuck footer, and scrolled content was still visible flowing
        // through it. Zeroed here (this dialog only, via the merged
        // className) to remove that gap entirely.
        className="pb-0"
        onOpenAutoFocus={(event) => {
          // #487 — Radix FocusScope otherwise focuses the header
          // `type="time"` input on open, which presents the native time
          // picker on iOS/Safari. Time UI only after an explicit tap.
          event.preventDefault()
        }}
      >
        <div className="flex items-center justify-between gap-2 pr-8">
          <DialogTitle>{mealLabel}</DialogTitle>
          <div className="flex items-center gap-1">
            <Input
              type="time"
              aria-label={t.dailyEntry.timeEatenLabel}
              value={timeEaten}
              onChange={(e) => onTimeEatenChange(e.target.value)}
              className="h-9 w-24"
            />
            {/* App-level clear button (#117) — restored after being
             * dropped in the #454 rewrite; the native time picker's own
             * Reset control isn't reliable enough to depend on alone. */}
            {timeEaten && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t.dailyEntry.clearTimeLabel}
                onClick={() => onTimeEatenChange('')}
              >
                <X aria-hidden="true" className="size-3.5" />
              </Button>
            )}
            {/* #459 — whole-meal delete, only meaningful once this dialog
             * is editing an already-saved meal (MealList's #461 overlay);
             * the in-progress "new meal" flow leaves onDeleteMeal
             * undefined. */}
            {onDeleteMeal && mealPosition !== undefined && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t.dailyEntry.deleteMealLabel(mealPosition)}
                onClick={() => setIsConfirmingMealDelete(true)}
              >
                <Trash2 aria-hidden="true" className="size-3.5" />
              </Button>
            )}
          </div>
        </div>
        {isConfirmingMealDelete && onDeleteMeal && (
          <div className="mt-2 flex items-center gap-2 rounded-lg bg-card p-2 ring-1 ring-foreground/10">
            <span className="text-sm text-muted-foreground">
              {t.history.confirmDeleteLabel}
            </span>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={onDeleteMeal}
            >
              {t.history.confirmDeleteYes}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsConfirmingMealDelete(false)}
            >
              {t.history.confirmDeleteNo}
            </Button>
          </div>
        )}

        {activeItem ? (
          <div className="mt-3 flex flex-col gap-3">
            <p className="text-sm font-medium">{textFor(activeItem)}</p>
            {activeItem.source === 'food' &&
              activeItem.food.servings &&
              activeItem.food.servings.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={servingMode === 'grams' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setServingMode('grams')}
                  >
                    {t.dailyEntry.gramsModeOption}
                  </Button>
                  {activeItem.food.servings.map((serving, index) => (
                    <Button
                      type="button"
                      key={index}
                      variant={
                        servingMode === String(index) ? 'default' : 'outline'
                      }
                      size="sm"
                      onClick={() => setServingMode(String(index))}
                    >
                      {serving[locale]}
                    </Button>
                  ))}
                </div>
              )}
            {activeServingFor(activeItem) ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {t.dailyEntry.servingCountLabel}
                </span>
                <Input
                  type="text"
                  inputMode="decimal"
                  aria-label={t.dailyEntry.servingCountLabel}
                  value={servingCount}
                  onChange={(e) => setServingCount(e.target.value)}
                  className="h-10 w-20"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {t.dailyEntry.foodQuantityLabel}
                </span>
                <Input
                  type="text"
                  inputMode="decimal"
                  aria-label={t.dailyEntry.foodQuantityLabel}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="h-10 w-20"
                />
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <span className="text-sm text-muted-foreground">
                {t.dailyEntry.itemEmotionLabel}
              </span>
              <EmotionPicker
                value={itemEmotion}
                onChange={setItemEmotion}
                options={MEAL_EMOTIONS}
                labelFor={t.dailyEntry.mealEmotionLabel}
                contextLabel={textFor(activeItem)}
              />
            </div>
            {activeTodayTotalPreview && (
              <p className="text-sm text-muted-foreground">
                {activeTodayTotalPreview}
              </p>
            )}
            {activeTodayRemainingPreview && (
              <p className="text-sm text-muted-foreground">
                {activeTodayRemainingPreview}
              </p>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={resetActiveItem}
              >
                {t.dailyEntry.cancelAddToMealLabel}
              </Button>
              <Button
                type="button"
                className="flex-1"
                disabled={!hasValidQuantity(activeItem)}
                onClick={confirmActiveItem}
              >
                {t.dailyEntry.addItemButton}
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-4">
            {previousMeal && previousMeal.items.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="xl"
                className="w-full"
                onClick={() => setIsRepeatOpen(true)}
              >
                {t.dailyEntry.repeatMealLabel(mealLabel)}
              </Button>
            )}
            <div className="relative">
              <Input
                type="text"
                aria-label={t.dailyEntry.foodSearchLabel}
                placeholder={t.dailyEntry.foodSearchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-12 pr-11 text-base"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t.dailyEntry.scanBarcodeButton}
                className="absolute top-1/2 right-1.5 -translate-y-1/2"
                onClick={() => setIsBarcodeOpen(true)}
              >
                <ScanBarcode aria-hidden="true" />
              </Button>
            </div>

            {query ? (
              matches.length === 0 ? (
                <div className="flex flex-col items-start gap-1.5">
                  <p className="text-sm text-muted-foreground">
                    {t.dailyEntry.noFoodResultsText}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="self-start"
                    onClick={() => setIsManualOpen(true)}
                  >
                    {t.dailyEntry.cantFindItAddManuallyLabel}
                  </Button>
                </div>
              ) : (
                <PickableItemList
                  items={matches}
                  textFor={textFor}
                  isFavorite={isFavorite}
                  onToggleFavorite={handleToggleFavorite}
                  onPick={(item) => {
                    setActiveItem(item)
                    setQuantity(defaultQuantityFor(item))
                  }}
                  t={t}
                  locale={locale}
                />
              )
            ) : (
              <>
                {/* #459 — 3 prominent bordered cards, replacing the old
                 * small plain-text links at the bottom. "Scan barcode" is
                 * a deliberate second entry point alongside the search
                 * bar's own scan icon, matching the mockup exactly. */}
                <div className="grid grid-cols-3 gap-2">
                  <QuickActionCard
                    Icon={Utensils}
                    label={t.dailyEntry.quickActionAddFoodLabel}
                    onClick={() => setIsManualOpen(true)}
                  />
                  <QuickActionCard
                    Icon={ScanBarcode}
                    label={t.dailyEntry.scanBarcodeButton}
                    ariaLabel={`${t.dailyEntry.scanBarcodeButton} — ${mealLabel}`}
                    onClick={() => setIsBarcodeOpen(true)}
                  />
                  <QuickActionCard
                    Icon={ChefHat}
                    label={t.recipes.logRecipeButton}
                    onClick={() => setIsRecipeOpen(true)}
                  />
                </div>
                {/* #480 — meal note used to sit above Search and read as
                 * the primary field; moved under the three quick actions
                 * so Search stays the clear first step. */}
                <Input
                  type="text"
                  aria-label={t.dailyEntry.mealNoteLabel}
                  placeholder={t.dailyEntry.mealNotePlaceholder}
                  value={note}
                  onChange={(e) => onNoteChange(e.target.value)}
                  className="h-10 text-sm"
                />
                {recentItems.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        {t.dailyEntry.recentFoodsLabel}
                      </span>
                      {allMealItems.length > RECENT_COUNT && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowAllRecent((current) => !current)}
                        >
                          {showAllRecent
                            ? t.dailyEntry.collapseRecentLabel
                            : t.dailyEntry.showAllRecentLabel}
                        </Button>
                      )}
                    </div>
                    <PickableItemList
                      items={recentItems}
                      textFor={textFor}
                      isFavorite={isFavorite}
                      onToggleFavorite={handleToggleFavorite}
                      onPick={(item) => {
                        setActiveItem(item)
                        setQuantity(defaultQuantityFor(item))
                      }}
                      t={t}
                      locale={locale}
                    />
                  </div>
                )}
              </>
            )}

            {items.length > 0 && (
              <div className="flex flex-col gap-2 border-t border-border pt-4">
                <span className="text-sm font-medium text-muted-foreground">
                  {t.dailyEntry.mealSoFarLabel}
                </span>
                <ul className="flex flex-col gap-1">
                  {items.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-start justify-between gap-2 py-2 text-sm"
                    >
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left hover:underline"
                        onClick={() => startEditItem(item)}
                      >
                        {item.name || t.dailyEntry.itemNamePlaceholder}
                      </button>
                      <span className="flex shrink-0 items-center gap-2 text-muted-foreground">
                        {formatNumber(item.amountKcal, locale, 0)}{' '}
                        {t.dailyEntry.kcalUnit}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t.dailyEntry.editItemSheetTitle}
                          onClick={() => startEditItem(item)}
                        >
                          <Pencil aria-hidden="true" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t.dailyEntry.deleteItemLabel}
                          onClick={() => onRemoveItem(item.id)}
                        >
                          <Trash2 aria-hidden="true" />
                        </Button>
                      </span>
                    </li>
                  ))}
                </ul>
                {todayTotalPreview && (
                  <p className="text-sm text-muted-foreground">
                    {todayTotalPreview}
                  </p>
                )}
                {todayRemainingPreview && (
                  <p className="text-sm text-muted-foreground">
                    {todayRemainingPreview}
                  </p>
                )}
                {/* pb-20 (reported live) — clears space for the sticky
                 * Done bar below, so it never overlaps/covers these
                 * reaction buttons once scrolled all the way down. */}
                <div className="flex flex-col gap-2 pt-2 pb-20">
                  <span className="text-sm text-muted-foreground">
                    {t.dailyEntry.wasItTastyLabel}
                  </span>
                  <EmotionPicker
                    value={reaction}
                    onChange={onReactionChange}
                    options={DAY_EMOTIONS}
                    labelFor={t.dailyEntry.mealReactionValueLabel}
                    size="icon-xl"
                    layout="spread"
                    contextLabel={mealLabel}
                  />
                </div>
                {/* Sticky footer (reported live — the button was scrolled
                 * out of view under a long enough item/Recent list). The
                 * bleed-through bug traced to DialogContent's own bottom
                 * padding (zeroed via its className prop above, see that
                 * comment) — *this* div's own pb is safe to use for visual
                 * clearance below the button, since it's this opaque box's
                 * own interior space, not a gap the scrolled content can
                 * show through. */}
                {/* #481 — DialogContent is edge-to-edge with safe-area in
                 * its own padding; this dialog zeros that bottom padding
                 * (`pb-0` above) so sticky sticks to the true viewport
                 * edge, so the safe-area clearance has to live here. */}
                <div className="sticky bottom-0 border-t border-border bg-card pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
                  <Button
                    type="button"
                    size="xl"
                    className="w-full"
                    onClick={() => onOpenChange(false)}
                  >
                    {t.dailyEntry.doneAddingMealButton}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {isRepeatOpen && previousMeal && (
          <RepeatMealDialog
            open={isRepeatOpen}
            onOpenChange={setIsRepeatOpen}
            mealLabel={mealLabel}
            items={previousMeal.items}
            onConfirm={handleRepeatConfirm}
          />
        )}
        {isRecipeOpen && (
          <LogRecipeDialog
            open={isRecipeOpen}
            onOpenChange={setIsRecipeOpen}
            recipes={recipes}
            onLog={handleRecipeLog}
          />
        )}
        {isBarcodeOpen && (
          <BarcodeScannerDialog
            open={isBarcodeOpen}
            onOpenChange={setIsBarcodeOpen}
            onScanned={handleScanned}
          />
        )}
        <MealItemEditorSheet
          open={isManualOpen}
          onOpenChange={(next) => {
            setIsManualOpen(next)
            if (!next) {
              setManualDraft(blankManualDraft())
              setBarcodeNotFoundMessage(false)
              setEditingItemId(null)
            }
          }}
          title={
            editingItemId
              ? t.dailyEntry.editItemSheetTitle
              : t.dailyEntry.addItemSheetTitle
          }
          // #475 — only auto-focus the name when adding a new dish; editing
          // must not select-all the existing name (easy accidental overwrite).
          autoFocusName={!editingItemId}
          name={manualDraft.name}
          onNameChange={(value) =>
            setManualDraft((draft) => ({ ...draft, name: value }))
          }
          brand={manualDraft.brand}
          onBrandChange={(value) =>
            setManualDraft((draft) => ({ ...draft, brand: value }))
          }
          amount={manualDraft.amount}
          onAmountChange={(value) =>
            setManualDraft((draft) => ({ ...draft, amount: value }))
          }
          protein={manualDraft.protein}
          onProteinChange={(value) =>
            setManualDraft((draft) => ({ ...draft, protein: value }))
          }
          fat={manualDraft.fat}
          onFatChange={(value) =>
            setManualDraft((draft) => ({ ...draft, fat: value }))
          }
          carbs={manualDraft.carbs}
          onCarbsChange={(value) =>
            setManualDraft((draft) => ({ ...draft, carbs: value }))
          }
          fiber={manualDraft.fiber}
          onFiberChange={(value) =>
            setManualDraft((draft) => ({ ...draft, fiber: value }))
          }
          note={manualDraft.note}
          onNoteChange={(value) =>
            setManualDraft((draft) => ({ ...draft, note: value }))
          }
          amountG={manualDraft.amountG}
          onAmountGChange={(value) =>
            setManualDraft((draft) => ({ ...draft, amountG: value }))
          }
          macroMode={manualDraft.macroMode}
          onMacroModeChange={changeManualDraftMode}
          mealItems={mealItems}
          onSelectMealItem={(item) => {
            if (item.lastAmountKcal === undefined) return
            const rates = ratesFromAbsolute(
              item.lastAmountKcal,
              item.lastProteinG,
              item.lastFatG,
              item.lastCarbsG,
              item.lastAmountG,
              item.lastFiberG,
            )
            setManualDraft((draft) => ({
              ...draft,
              amount: String(rates.kcal100),
              protein:
                rates.protein100 === undefined ? '' : String(rates.protein100),
              fat: rates.fat100 === undefined ? '' : String(rates.fat100),
              carbs: rates.carbs100 === undefined ? '' : String(rates.carbs100),
              fiber: rates.fiber100 === undefined ? '' : String(rates.fiber100),
              amountG: String(rates.portions),
            }))
          }}
          emotion={manualDraft.emotion}
          onEmotionChange={(value) =>
            setManualDraft((draft) => ({ ...draft, emotion: value }))
          }
          favorite={manualDraft.favorite}
          onFavoriteChange={(value) =>
            setManualDraft((draft) => ({ ...draft, favorite: value }))
          }
          todayTotalPreview={todayTotalPreview ?? undefined}
          todayRemainingPreview={todayRemainingPreview ?? undefined}
          infoMessage={
            barcodeNotFoundMessage
              ? t.dailyEntry.noFoodFoundForBarcodeMessage
              : undefined
          }
          onSave={saveManualDraft}
        />
      </DialogContent>
    </Dialog>
  )
}

// #459 — the quick-action row's own bordered-card treatment (icon + label,
// evenly sized via the parent's grid-cols-3), replacing the old plain-text
// ghost-link row.
function QuickActionCard({
  Icon,
  label,
  ariaLabel,
  onClick,
}: {
  Icon: LucideIcon
  label: string
  /** Overrides the visible `label` as the accessible name — needed for the
   * barcode card, whose visible text ("Scan barcode") would otherwise
   * collide with the search bar's own same-labeled icon button (#459
   * deliberately keeps both, reversing #454's one-entry-point decision). */
  ariaLabel?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className="flex flex-col items-center gap-1.5 rounded-lg border border-border p-3 text-center text-xs font-medium hover:bg-muted"
      onClick={onClick}
    >
      <Icon aria-hidden="true" className="size-5" />
      {label}
    </button>
  )
}

function PickableItemList({
  items,
  textFor,
  isFavorite,
  onToggleFavorite,
  onPick,
  t,
  locale,
}: {
  items: PickableItem[]
  textFor: (item: PickableItem) => string
  isFavorite: (item: PickableItem) => boolean
  onToggleFavorite: (item: PickableItem) => void
  onPick: (item: PickableItem) => void
  t: ReturnType<typeof useTranslation>
  locale: ReturnType<typeof useLocale>
}) {
  return (
    <ul className="flex max-h-72 flex-col overflow-y-auto rounded-lg border border-border">
      {items.map((item) => (
        <li key={itemKey(item)} className="flex items-stretch">
          <button
            type="button"
            className="flex w-full min-w-0 items-start gap-2 px-2.5 py-1.5 text-left text-sm hover:bg-muted"
            onClick={() => onPick(item)}
          >
            <span className="flex flex-col">
              {item.source === 'food' ? (
                <>
                  <span>{item.food[locale]}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {formatNumber(item.food.kcal100, locale, 0)}{' '}
                    {t.dailyEntry.kcalUnit} {t.dailyEntry.per100gLabel} ·{' '}
                    {macrosSummaryTextCompact(
                      item.food.protein100,
                      item.food.fat100,
                      item.food.carbs100,
                      locale,
                      t,
                    )}
                  </span>
                </>
              ) : (
                <>
                  <span>{item.mealItem.name}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {formatNumber(item.mealItem.lastAmountKcal, locale, 0)}{' '}
                    {t.dailyEntry.kcalUnit} {t.dailyEntry.lastLoggedLabel} ·{' '}
                    {macrosSummaryTextCompact(
                      item.mealItem.lastProteinG,
                      item.mealItem.lastFatG,
                      item.mealItem.lastCarbsG,
                      locale,
                      t,
                    )}
                  </span>
                </>
              )}
            </span>
          </button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="mr-1 shrink-0 self-center"
            aria-label={
              isFavorite(item)
                ? t.dailyEntry.unfavoriteFoodLabel(textFor(item))
                : t.dailyEntry.favoriteFoodLabel(textFor(item))
            }
            aria-pressed={isFavorite(item)}
            onClick={() => onToggleFavorite(item)}
          >
            <Star
              aria-hidden="true"
              className={cn(isFavorite(item) && 'fill-current')}
            />
          </Button>
        </li>
      ))}
    </ul>
  )
}
