import { useEffect, useRef, useState } from 'react'
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
import {
  evaluateMealNutritionFacts,
  type NutritionFactId,
} from '@/domain/nutritionFacts'
import { formatNumber, useLocale, useTranslation } from '@/i18n'
import { applyFoodOverrides } from '@/shared/lib/applyFoodOverrides'
import { DAY_EMOTIONS } from '@/shared/lib/emotionIcons'
import {
  formatKcal,
  formatMacroGrams,
  macrosSummaryTextCompact,
} from '@/shared/lib/macroDisplay'
import {
  gramsToPortions,
  parseOptionalMacro,
  portionsToGrams,
  ratesFromAbsolute,
  scaleFromPer100g,
  scaleTotalsByWeightChange,
  totalFromPortion,
} from '@/shared/lib/macroScaling'
import { parseNumberInput } from '@/shared/lib/parseNumberInput'
import { mealLabelSuggestionsForLocale } from '@/shared/lib/mealLabel'
import { normalizeTextSpaces } from '@/shared/lib/normalizeTextSpaces'
import { rankBySearchMatch } from '@/shared/lib/searchRank'
import { cn } from '@/shared/lib/utils'
import { useOnlineStatus } from '@/shared/hooks'
import {
  useFoodOverrideStore,
  useMealItemStore,
  useMealLabelPresetStore,
  useMicronutrientTrackingStore,
  useNutritionFactsStore,
  useRecipeStore,
  useAddMealRecentVisibilityStore,
  useEatingReasonTrackingStore,
  useTrackedFieldsStore,
} from '@/stores'
import { IndexedDbMealItemRepository } from '@/infrastructure/persistence/indexeddb'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { SectionTitleWithToggle } from '@/shared/ui/section-title-with-toggle'
import { LogRecipeDialog } from '@/features/recipes'
import { BarcodeScannerDialog } from './BarcodeScannerDialog'
import { EatingReasonPicker } from './EatingReasonPicker'
import { EmotionPicker } from './EmotionPicker'
import type { PickedFoodValues } from './FoodPickerDialog'
import { foodItemFromOff } from './foodItemFromOff'
import { lookupBarcode } from './lookupBarcode'
import { MealItemEditorSheet } from './MealItemEditorSheet'
import { RepeatMealDialog } from './RepeatMealDialog'
import {
  OFF_SEARCH_MIN_CHARS,
  searchOnlineFoods,
  type OnlineFoodHit,
  type OnlineSearchRemoteStatus,
} from './searchOnlineFoods'

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
// own defaultQuantityFor (now only used by the separate recipe-log flow,
// #645) — duplicated rather than shared, for one small pure function.
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
    sodium: '',
    potassium: '',
    magnesium: '',
    note: '',
    amountG: '1',
    macroMode: 'per100g' as 'per100g' | 'perPortion',
    emotion: undefined as MealEmotion | undefined,
    favorite: false,
  }
}

type ManualDraft = ReturnType<typeof blankManualDraft>

/** #715 — fixed density baseline for Portion-mode weight edits. Scaling
 * from the previous keystroke's grams breaks while typing ("50" → "5" →
 * "20"); always multiply from the last committed nutrition+weight pair. */
type PortionScaleBase = {
  grams: number
  amount: string
  protein: string
  fat: string
  carbs: string
  fiber: string
  sodium: string
  potassium: string
  magnesium: string
}

function portionScaleBaseFromDraft(
  draft: ManualDraft,
): PortionScaleBase | null {
  if (draft.macroMode !== 'perPortion') return null
  const grams = parseOptionalMacro(draft.amountG)
  if (!grams || grams <= 0) return null
  const amountNum = parseNumberInput(draft.amount)
  if (!amountNum || amountNum <= 0) return null
  return {
    grams,
    amount: draft.amount,
    protein: draft.protein,
    fat: draft.fat,
    carbs: draft.carbs,
    fiber: draft.fiber,
    sodium: draft.sodium,
    potassium: draft.potassium,
    magnesium: draft.magnesium,
  }
}

function applyPortionWeightToDraft(
  draft: ManualDraft,
  nextAmountG: string,
  base: PortionScaleBase | null,
): ManualDraft {
  const nextGrams = parseOptionalMacro(nextAmountG)
  if (!base || !nextGrams || nextGrams <= 0) {
    return { ...draft, amountG: nextAmountG }
  }
  const amountNum = parseNumberInput(base.amount)
  if (!amountNum || amountNum <= 0) {
    return { ...draft, amountG: nextAmountG }
  }
  const scaled = scaleTotalsByWeightChange(
    amountNum,
    parseOptionalMacro(base.protein),
    parseOptionalMacro(base.fat),
    parseOptionalMacro(base.carbs),
    base.grams,
    nextGrams,
    parseOptionalMacro(base.fiber),
    parseOptionalMacro(base.sodium),
    parseOptionalMacro(base.potassium),
    parseOptionalMacro(base.magnesium),
  )
  if (!scaled) return { ...draft, amountG: nextAmountG }
  return {
    ...draft,
    amountG: nextAmountG,
    amount: String(scaled.amountKcal),
    protein: scaled.proteinG === undefined ? '' : String(scaled.proteinG),
    fat: scaled.fatG === undefined ? '' : String(scaled.fatG),
    carbs: scaled.carbsG === undefined ? '' : String(scaled.carbsG),
    fiber: scaled.fiberG === undefined ? '' : String(scaled.fiberG),
    sodium: scaled.sodiumMg === undefined ? '' : String(scaled.sodiumMg),
    potassium:
      scaled.potassiumMg === undefined ? '' : String(scaled.potassiumMg),
    magnesium:
      scaled.magnesiumMg === undefined ? '' : String(scaled.magnesiumMg),
  }
}

export interface AddMealDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** #491 — called when the user taps Done (confirm keep). Closing via
   * the dialog X / escape / overlay does *not* call this — MealList uses
   * that distinction to discard an in-progress new meal. */
  onDone?: () => void
  /** #494 — MealList sets this when X would discard foods already added
   * this session; Cancel clears it and stays in the flyout. */
  isConfirmingDiscard?: boolean
  onConfirmDiscard?: () => void
  onCancelDiscard?: () => void
  /** #509 — overrides #494's new-meal discard copy (edit-existing uses
   * `confirmDiscardEditedMealLabel`). */
  discardConfirmLabel?: string
  /** #509 — edit overlay: keep Done reachable after the last composition
   * row is removed so empty-meal commit can delete the saved meal. */
  showDoneWhenEmpty?: boolean
  /** Position-derived default, or the meal's own custom label —
   * computed by `MealList.tsx` via `effectiveMealLabel`/`defaultMealLabel`.
   * Editable in the header (#563); chips offer Breakfast/Lunch/Dinner/Snack
   * plus any Settings presets. */
  mealLabel: string
  /** #563 — free-text or chip pick; parent stores a custom `CalorieEntry.label`
   * (or clears it when the value matches the positional default). */
  onMealLabelChange: (value: string) => void
  /** #459 — the meal's 1-based position within the day, needed for the
   * whole-meal delete button's aria-label (`deleteMealLabel(n)`) and for
   * #563's "matches positional default → clear custom label" normalize.
   * Always passed from MealList for both add and edit. */
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
  /** #764 / #774 — why this meal happened. Optional; only shown when
   * Settings tracking is on. Built-in ids and/or custom Settings labels.
   * Can be set before the first food lands. Empty = not specified. */
  eatingReasons?: string[]
  onEatingReasonsChange?: (reasons: string[]) => void
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
    /** Day totals for meals *other than* the one this dialog is composing
     * (#566). The dialog adds `items` on top for "Today would be" /
     * remaining previews — including this meal here double-subtracts. */
    kcal: number
    proteinG: number
    fatG: number
    carbsG: number
  }
  dailyCalorieTargetKcal?: number
  /** #663 — per-meal nutrition facts already satisfied by today's *other*
   * meals (MealList's `otherMealsSatisfiedFactIds`), so this dialog's own
   * inline praise only shows a fact the first time a meal hits it today. */
  alreadySatisfiedFactIds?: NutritionFactId[]
}

/**
 * #454 — the "add a meal" flow, redesigned from an inline accordion into a
 * dedicated full-screen flyout: search (with barcode scan folded into the
 * input itself) + a Recent list + Repeat/recipe/manual-entry quick actions,
 * all appending straight into the *same* in-progress meal (`items`, `date`'s
 * own `CalorieEntry` tracked by `MealList`) so the flyout can stay open
 * across several single-dish adds instead of closing after each one.
 * `FoodPickerDialog.tsx` isn't used by this flow at all (its only remaining
 * caller is recipe logging, a different feature) — this duplicates its
 * ranking/quantity logic rather than sharing it, a deliberate tradeoff to
 * avoid risking a regression in that still-active, more heavily-tested flow.
 *
 * #645 — every entry point (search/recent pick, barcode scan, manual
 * "create a dish") now confirms through the same `MealItemEditorSheet`
 * (`openPickedItemSheet` below), instead of scan/pick landing on a
 * separate, flatter inline confirm block with no per100g/portion toggle —
 * that duplicate screen used to exist here, alongside the sheet, purely
 * because the pre-#645 rewrite never merged them.
 */
export function AddMealDialog({
  open,
  onOpenChange,
  onDone,
  isConfirmingDiscard = false,
  onConfirmDiscard,
  onCancelDiscard,
  discardConfirmLabel,
  showDoneWhenEmpty = false,
  mealLabel,
  onMealLabelChange,
  mealPosition,
  timeEaten,
  onTimeEatenChange,
  note,
  onNoteChange,
  previousMeal,
  items,
  reaction,
  onReactionChange,
  eatingReasons = [],
  onEatingReasonsChange,
  onAppendItems,
  onRemoveItem,
  onUpdateItem,
  onDeleteMeal,
  todayTotals,
  dailyCalorieTargetKcal,
  alreadySatisfiedFactIds,
}: AddMealDialogProps) {
  const t = useTranslation()
  const locale = useLocale()
  const isOnline = useOnlineStatus()
  const eatingReasonTrackingEnabled = useEatingReasonTrackingStore(
    (state) => state.enabled,
  )

  const mealItems = useMealItemStore((state) => state.items)
  const touchMealItem = useMealItemStore((state) => state.touch)
  const recipes = useRecipeStore((state) => state.recipes)
  const loadRecipes = useRecipeStore((state) => state.loadRecipes)
  const foodOverrides = useFoodOverrideStore((state) => state.overrides)
  const loadFoodOverrides = useFoodOverrideStore((state) => state.loadOverrides)
  const setFoodFavorite = useFoodOverrideStore((state) => state.setFavorite)
  const toggleMealItemFavorite = useMealItemStore((state) => state.toggleFavorite)
  // #507 — persisted eye toggle for the Recent list (same idea as #245).
  const recentVisible = useAddMealRecentVisibilityStore(
    (state) => state.recentVisible,
  )
  const toggleRecentVisible = useAddMealRecentVisibilityStore(
    (state) => state.toggleRecentVisible,
  )
  const mealLabelPresets = useMealLabelPresetStore((state) => state.presets)
  const micronutrients = useMicronutrientTrackingStore((state) => state.tracked)
  const trackFiber = useTrackedFieldsStore((state) => state.tracked.fiber)
  // #663 — gates the inline meal-composition praise below, on by default.
  const nutritionFactsEnabled = useNutritionFactsStore((state) => state.enabled)
  // #563/#567 — Breakfast/Lunch/Dinner/Snack for the active locale, then
  // custom Settings presets that aren't a built-in default in any locale.
  const mealLabelSuggestions = mealLabelSuggestionsForLocale(
    t,
    mealLabelPresets,
  )
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
  // #645 — servings toggle (#254) for whichever picked item the manual
  // sheet is currently confirming; undefined/empty hides the toggle
  // entirely (the plain "create a dish from scratch" flow, and any pick
  // with no seeded servings of its own). Only a curated/OFF `food` source
  // ever carries these (see openPickedItemSheet below), same restriction
  // the pre-#645 confirm step had.
  const [activeServings, setActiveServings] = useState<
    FoodServing[] | undefined
  >(undefined)
  const [servingMode, setServingMode] = useState('grams')
  const [servingCount, setServingCount] = useState('1')
  // #645 — true while the sheet is confirming a search/recent/barcode pick
  // (openPickedItemSheet) rather than a from-scratch manual create or an
  // existing-item edit — gates the richer "Today would be" preview below
  // (#273), which needs this draft's own prospective total folded in; the
  // scratch/edit flows never showed that and still don't.
  const [isConfirmingPick, setIsConfirmingPick] = useState(false)

  const [isRepeatOpen, setIsRepeatOpen] = useState(false)
  const [isRecipeOpen, setIsRecipeOpen] = useState(false)
  const [isBarcodeOpen, setIsBarcodeOpen] = useState(false)
  const [isManualOpen, setIsManualOpen] = useState(false)
  const [manualDraft, setManualDraft] = useState(blankManualDraft)
  // #715 — Portion-mode weight edits scale from this baseline, not the
  // previous keystroke (see portionScaleBaseFromDraft).
  const portionScaleBaseRef = useRef<PortionScaleBase | null>(null)
  const [barcodeNotFoundMessage, setBarcodeNotFoundMessage] = useState(false)
  // #518 — barcode from a not-found / Open Food Facts scan, held until the
  // food is saved so touch(..., barcode) can make the next scan a local hit.
  const [pendingBarcode, setPendingBarcode] = useState<string | null>(null)
  // #459 — non-null while the manual-entry sheet is editing an
  // already-added item (tapped from "This meal so far") rather than
  // building a brand-new one; changes what saveManualDraft() does on Save.
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [showAllRecent, setShowAllRecent] = useState(false)
  const [isConfirmingMealDelete, setIsConfirmingMealDelete] = useState(false)
  // #509 — trash on a composition row asks first; not a hard delete.
  const [confirmRemoveItemId, setConfirmRemoveItemId] = useState<string | null>(
    null,
  )
  // #531/#535 — explicit online search (never per keystroke): OFF → USDA
  // fallback + bundled RU generics.
  const [onlineHits, setOnlineHits] = useState<OnlineFoodHit[]>([])
  const [onlineSearchStatus, setOnlineSearchStatus] = useState<
    'idle' | 'loading' | 'done'
  >('idle')
  const [onlineRemoteStatus, setOnlineRemoteStatus] =
    useState<OnlineSearchRemoteStatus | null>(null)
  const onlineSearchAbortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => {
      onlineSearchAbortRef.current?.abort()
    }
  }, [])

  function clearOnlineSearch() {
    onlineSearchAbortRef.current?.abort()
    onlineSearchAbortRef.current = null
    setOnlineHits([])
    setOnlineSearchStatus('idle')
    setOnlineRemoteStatus(null)
  }

  function touchIfPersonal(item: CalorieItem) {
    // #518 — barcode-sourced saves must always land in the personal
    // library (with the code), even when the typed/OFF name matches a
    // curated catalog entry. Skipping those left Custom foods empty and
    // made every later scan look like a first-time not-found.
    const fromBarcode = pendingBarcode != null
    if (!item.name) return
    if (!fromBarcode && curatedFoodNames.has(item.name)) return
    void touchMealItem(
      item.name,
      {
        amountKcal: item.amountKcal,
        proteinG: item.proteinG,
        fatG: item.fatG,
        carbsG: item.carbsG,
        fiberG: item.fiberG,
        amountG: item.amountG,
        sodiumMg: item.sodiumMg,
        potassiumMg: item.potassiumMg,
        magnesiumMg: item.magnesiumMg,
      },
      undefined,
      pendingBarcode ?? undefined,
    )
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

  /** #645 — pick (search/recent/barcode) → confirm step, now the same
   * `MealItemEditorSheet` "create a dish" already used, instead of a
   * separate flatter inline confirm block with no per100g/portion toggle.
   * Seeds whichever `macroMode` is the direct passthrough for the picked
   * item's own source data: a curated/OFF `food` already carries a
   * per-100g rate (`per100g` mode). A personal `mealItem` with a recorded
   * last weight (#715) also opens in `per100g` via `ratesFromAbsolute` so
   * density stays the source of truth when quantity changes; without
   * `lastAmountG` it still opens in `perPortion` from the last-logged
   * total alone. `brandOverride` is OFF-only. **#788**: `barcodeOverride`
   * is also passed for a local library hit so a renamed save updates that
   * barcode's MealItem in place. */
  function openPickedItemSheet(
    item: PickableItem,
    options?: { brandOverride?: string; barcodeOverride?: string },
  ) {
    setEditingItemId(null)
    setBarcodeNotFoundMessage(false)
    setPendingBarcode(options?.barcodeOverride ?? null)
    setServingMode('grams')
    setServingCount('1')
    setActiveServings(item.source === 'food' ? item.food.servings : undefined)
    setIsConfirmingPick(true)
    if (item.source === 'food') {
      const { food } = item
      const draft = {
        name: food[locale],
        brand: options?.brandOverride ?? '',
        amount: String(food.kcal100),
        protein: String(food.protein100),
        fat: String(food.fat100),
        carbs: String(food.carbs100),
        fiber: food.fiber100 === undefined ? '' : String(food.fiber100),
        sodium:
          food.sodium100Mg === undefined ? '' : String(food.sodium100Mg),
        potassium:
          food.potassium100Mg === undefined
            ? ''
            : String(food.potassium100Mg),
        magnesium:
          food.magnesium100Mg === undefined
            ? ''
            : String(food.magnesium100Mg),
        note: '',
        amountG: String(gramsToPortions(defaultQuantityFor(item))),
        macroMode: 'per100g' as const,
        emotion: undefined,
        favorite: false,
      }
      portionScaleBaseRef.current = null
      setManualDraft(draft)
    } else {
      const { mealItem } = item
      const lastGrams = mealItem.lastAmountG
      if (
        lastGrams !== undefined &&
        lastGrams > 0 &&
        mealItem.lastAmountKcal !== undefined
      ) {
        // #715 — known weight → density is source of truth (per-100g).
        const rates = ratesFromAbsolute(
          mealItem.lastAmountKcal,
          mealItem.lastProteinG,
          mealItem.lastFatG,
          mealItem.lastCarbsG,
          lastGrams,
          mealItem.lastFiberG,
          mealItem.lastSodiumMg,
          mealItem.lastPotassiumMg,
          mealItem.lastMagnesiumMg,
        )
        const draft: ManualDraft = {
          name: mealItem.name,
          brand: '',
          amount: String(rates.kcal100),
          protein:
            rates.protein100 === undefined ? '' : String(rates.protein100),
          fat: rates.fat100 === undefined ? '' : String(rates.fat100),
          carbs: rates.carbs100 === undefined ? '' : String(rates.carbs100),
          fiber: rates.fiber100 === undefined ? '' : String(rates.fiber100),
          sodium: rates.sodium100 === undefined ? '' : String(rates.sodium100),
          potassium:
            rates.potassium100 === undefined
              ? ''
              : String(rates.potassium100),
          magnesium:
            rates.magnesium100 === undefined
              ? ''
              : String(rates.magnesium100),
          note: '',
          amountG: String(rates.portions),
          macroMode: 'per100g',
          emotion: undefined,
          favorite: false,
        }
        portionScaleBaseRef.current = null
        setManualDraft(draft)
      } else {
        const draft: ManualDraft = {
          name: mealItem.name,
          brand: '',
          amount: String(mealItem.lastAmountKcal),
          protein:
            mealItem.lastProteinG === undefined
              ? ''
              : String(mealItem.lastProteinG),
          fat: mealItem.lastFatG === undefined ? '' : String(mealItem.lastFatG),
          carbs:
            mealItem.lastCarbsG === undefined
              ? ''
              : String(mealItem.lastCarbsG),
          fiber:
            mealItem.lastFiberG === undefined
              ? ''
              : String(mealItem.lastFiberG),
          sodium:
            mealItem.lastSodiumMg === undefined
              ? ''
              : String(mealItem.lastSodiumMg),
          potassium:
            mealItem.lastPotassiumMg === undefined
              ? ''
              : String(mealItem.lastPotassiumMg),
          magnesium:
            mealItem.lastMagnesiumMg === undefined
              ? ''
              : String(mealItem.lastMagnesiumMg),
          note: '',
          amountG: defaultQuantityFor(item),
          macroMode: 'perPortion',
          emotion: undefined,
          favorite: false,
        }
        portionScaleBaseRef.current = portionScaleBaseFromDraft(draft)
        setManualDraft(draft)
      }
    }
    setIsManualOpen(true)
  }

  /** #645 — a servings-toggle pick (or its count changing) recomputes
   * `manualDraft.amountG` in whatever unit the active `macroMode` expects
   * — real grams in perPortion mode, a portions-of-100g count in per100g
   * mode (`gramsToPortions`, the same conversion `changeManualDraftMode`
   * below already applies on a macroMode switch) — so the two stay
   * consistent regardless of which mode was active when the serving was
   * picked. #715 — in Portion mode this also rescales kcal/macros from
   * the density baseline. */
  function applyServingToAmountG(servingIndexRaw: string, countRaw: string) {
    const serving = activeServings?.[Number(servingIndexRaw)]
    if (!serving) return
    const countNum = parseNumberInput(countRaw)
    const count = countNum && countNum > 0 ? countNum : 1
    const grams = serving.grams * count
    setManualDraft((draft) => {
      if (draft.macroMode === 'perPortion') {
        const next = applyPortionWeightToDraft(
          draft,
          String(grams),
          portionScaleBaseRef.current,
        )
        // Serving pick commits a new weight+totals pair — refresh baseline.
        portionScaleBaseRef.current = portionScaleBaseFromDraft(next)
        return next
      }
      return {
        ...draft,
        amountG: String(gramsToPortions(String(grams))),
      }
    })
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
      const item: PickableItem = {
        source: 'mealItem',
        mealItem: result.item as MealItem & { lastAmountKcal: number },
      }
      // #788 — keep the scanned code on save so a renamed title updates
      // this MealItem in place instead of creating a barcode-less duplicate.
      openPickedItemSheet(item, { barcodeOverride: barcode })
    } else if (result.source === 'openFoodFacts') {
      // Not a catalog/personal-library item yet — represented as a
      // one-off synthetic food so the same confirm step (which only knows
      // about PickableItem) can still handle it.
      const syntheticFood = foodItemFromOff({
        name: result.name,
        code: barcode,
        kcal100: result.kcal100,
        protein100: result.protein100,
        fat100: result.fat100,
        carbs100: result.carbs100,
        fiber100: result.fiber100,
        sodium100Mg: result.sodium100Mg,
        potassium100Mg: result.potassium100Mg,
        magnesium100Mg: result.magnesium100Mg,
      })
      openPickedItemSheet(
        { source: 'food', food: syntheticFood },
        { brandOverride: result.brand, barcodeOverride: barcode },
      )
    } else {
      // #518 — keep the scanned code through manual create so the next
      // scan of the same product is a local hit.
      setActiveServings(undefined)
      setIsConfirmingPick(false)
      setPendingBarcode(barcode)
      setBarcodeNotFoundMessage(true)
      setIsManualOpen(true)
    }
  }

  async function runOnlineSearch() {
    const rawQuery = search.trim()
    if (rawQuery.length < OFF_SEARCH_MIN_CHARS) return
    onlineSearchAbortRef.current?.abort()
    const controller = new AbortController()
    onlineSearchAbortRef.current = controller
    setOnlineSearchStatus('loading')
    setOnlineHits([])
    setOnlineRemoteStatus(null)
    const result = await searchOnlineFoods(rawQuery, {
      signal: controller.signal,
      online: isOnline,
    })
    if (controller.signal.aborted) return
    setOnlineHits(result.hits)
    setOnlineRemoteStatus(result.remoteStatus)
    setOnlineSearchStatus('done')
  }

  function pickOnlineHit(hit: OnlineFoodHit) {
    const food = foodItemFromOff(hit)
    openPickedItemSheet(
      { source: 'food', food },
      { brandOverride: hit.brand, barcodeOverride: hit.code },
    )
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
        // #715 — without nutrition yet, don't invent a Portion weight from
        // the per-100g default of 1 portion (100g). That became a fake
        // density baseline when the user typed kcal then Weight. An
        // explicit non-default portions count still converts to grams.
        const portions = parseOptionalMacro(draft.amountG)
        const nextAmountG =
          newMode === 'perPortion'
            ? portions && portions !== 1
              ? String(portionsToGrams(draft.amountG) ?? '')
              : ''
            : convertedAmountG
        const next = {
          ...draft,
          amountG: nextAmountG,
          macroMode: newMode,
        }
        portionScaleBaseRef.current = portionScaleBaseFromDraft(next)
        return next
      }
      if (newMode === 'perPortion') {
        const scaled = scaleFromPer100g(
          amountNum,
          parseOptionalMacro(draft.protein),
          parseOptionalMacro(draft.fat),
          parseOptionalMacro(draft.carbs),
          draft.amountG,
          parseOptionalMacro(draft.fiber),
          parseOptionalMacro(draft.sodium),
          parseOptionalMacro(draft.potassium),
          parseOptionalMacro(draft.magnesium),
        )
        const next: ManualDraft = {
          ...draft,
          amount: String(scaled.amountKcal),
          protein: scaled.proteinG === undefined ? '' : String(scaled.proteinG),
          fat: scaled.fatG === undefined ? '' : String(scaled.fatG),
          carbs: scaled.carbsG === undefined ? '' : String(scaled.carbsG),
          fiber: scaled.fiberG === undefined ? '' : String(scaled.fiberG),
          sodium: scaled.sodiumMg === undefined ? '' : String(scaled.sodiumMg),
          potassium:
            scaled.potassiumMg === undefined ? '' : String(scaled.potassiumMg),
          magnesium:
            scaled.magnesiumMg === undefined ? '' : String(scaled.magnesiumMg),
          amountG: convertedAmountG,
          macroMode: newMode,
        }
        portionScaleBaseRef.current = portionScaleBaseFromDraft(next)
        return next
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
        parseOptionalMacro(draft.sodium),
        parseOptionalMacro(draft.potassium),
        parseOptionalMacro(draft.magnesium),
      )
      const next: ManualDraft = {
        ...draft,
        amount: String(rates.kcal100),
        protein: rates.protein100 === undefined ? '' : String(rates.protein100),
        fat: rates.fat100 === undefined ? '' : String(rates.fat100),
        carbs: rates.carbs100 === undefined ? '' : String(rates.carbs100),
        fiber: rates.fiber100 === undefined ? '' : String(rates.fiber100),
        sodium: rates.sodium100 === undefined ? '' : String(rates.sodium100),
        potassium:
          rates.potassium100 === undefined ? '' : String(rates.potassium100),
        magnesium:
          rates.magnesium100 === undefined ? '' : String(rates.magnesium100),
        amountG: convertedAmountG,
        macroMode: newMode,
      }
      portionScaleBaseRef.current = null
      return next
    })
  }

  /** #715 — Portion mode: changing weight rescales kcal/macros from the
   * density baseline. Per-100g mode only updates the portions count; rates
   * stay put and the live preview multiplies.
   *
   * Baseline is set on open / mode-switch / nutrition edits — not while
   * typing Weight for the first time (otherwise "1" of "150" becomes a
   * 1g density and 450 kcal explodes to 67500). No baseline → record
   * grams only (blank Portion create: type kcal, then weight). */
  function changeManualDraftAmountG(value: string) {
    setManualDraft((draft) => {
      if (draft.macroMode !== 'perPortion') {
        return { ...draft, amountG: value }
      }
      const nextGrams = parseOptionalMacro(value)
      const base = portionScaleBaseRef.current
      if (!base || !nextGrams || nextGrams <= 0) {
        return { ...draft, amountG: value }
      }
      return applyPortionWeightToDraft(draft, value, base)
    })
  }

  function commitPortionScaleBase() {
    portionScaleBaseRef.current = portionScaleBaseFromDraft(manualDraft)
  }

  function patchManualDraftNutrition(
    patch: Partial<
      Pick<
        ManualDraft,
        | 'amount'
        | 'protein'
        | 'fat'
        | 'carbs'
        | 'fiber'
        | 'sodium'
        | 'potassium'
        | 'magnesium'
      >
    >,
  ) {
    setManualDraft((draft) => {
      const next = { ...draft, ...patch }
      // Nutrition edits in Portion mode redefine density — refresh baseline.
      if (next.macroMode === 'perPortion') {
        portionScaleBaseRef.current = portionScaleBaseFromDraft(next)
      }
      return next
    })
  }

  function saveManualDraft() {
    const amountNum = parseNumberInput(manualDraft.amount)
    if (!amountNum || amountNum <= 0) return
    // #518 — barcode not-found create must have a name so we can touch a
    // MealItem; Save is also gated via requireName on the sheet.
    const trimmedName = normalizeTextSpaces(manualDraft.name).trim()
    if (pendingBarcode && !trimmedName) return
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
            parseOptionalMacro(manualDraft.sodium),
            parseOptionalMacro(manualDraft.potassium),
            parseOptionalMacro(manualDraft.magnesium),
          )
        : totalFromPortion(
            amountNum,
            parseOptionalMacro(manualDraft.protein),
            parseOptionalMacro(manualDraft.fat),
            parseOptionalMacro(manualDraft.carbs),
            manualDraft.amountG,
            parseOptionalMacro(manualDraft.fiber),
            parseOptionalMacro(manualDraft.sodium),
            parseOptionalMacro(manualDraft.potassium),
            parseOptionalMacro(manualDraft.magnesium),
          )
    const barcodeToSave = pendingBarcode ?? undefined
    const favoriteToSave = manualDraft.favorite || undefined
    const newItem: CalorieItem = {
      id: editingItemId ?? crypto.randomUUID(),
      name: trimmedName || undefined,
      brand: normalizeTextSpaces(manualDraft.brand).trim() || undefined,
      ...scaled,
      emotion: manualDraft.emotion,
      noteText: manualDraft.note.trim() || undefined,
    }
    if (editingItemId && onUpdateItem) {
      onUpdateItem(newItem)
    } else {
      onAppendItems([newItem])
      // #645 — a search/recent/barcode pick now saves through this same
      // function; clear the still-typed query so the browse view doesn't
      // reappear showing a stale results list under "This meal so far"
      // (the old separate confirm step used to clear this on its own
      // commit, `confirmActiveItem`, since removed).
      setSearch('')
    }
    // Close the sheet before awaiting library I/O. `onSave` is invoked as
    // `void saveManualDraft()`, so awaiting touch *before* close left the
    // editor open when MealList tests immediately looked for Close/Done
    // (CI run 30718165978). Capture favorite/barcode first — draft resets
    // below. #518 still attaches barcode on touch; AddMealDialog tests
    // wait on the store before rescanning.
    const shouldTouch =
      !!trimmedName &&
      (!!barcodeToSave || !curatedFoodNames.has(trimmedName))
    setPendingBarcode(null)
    setManualDraft(blankManualDraft())
    setEditingItemId(null)
    setIsManualOpen(false)
    // A single touchMealItem call, not touchIfPersonal *and* this — calling
    // both raced two writes to the personal library's unique `name` index
    // for the same dish (confirmed via a real ConstraintError under test).
    // #518 — barcode-sourced saves bypass the curated-name skip.
    if (shouldTouch) {
      void touchMealItem(
        trimmedName,
        {
          amountKcal: newItem.amountKcal,
          proteinG: newItem.proteinG,
          fatG: newItem.fatG,
          carbsG: newItem.carbsG,
          fiberG: newItem.fiberG,
          amountG: newItem.amountG,
          sodiumMg: newItem.sodiumMg,
          potassiumMg: newItem.potassiumMg,
          magnesiumMg: newItem.magnesiumMg,
        },
        favoriteToSave,
        barcodeToSave,
      )
    }
  }

  // #459 — tapping an already-added item in "This meal so far" opens the
  // same manual-entry sheet pre-filled with its exact current values.
  // 'perPortion' mode is the direct passthrough representation (see
  // totalFromPortion) — amount/protein/fat/carbs/fiber are the item's own
  // absolute values unchanged, amountG is its own real grams — so no rate
  // math is needed to round-trip it, unlike reconstructing a per100g rate.
  function startEditItem(item: CalorieItem) {
    setEditingItemId(item.id)
    setPendingBarcode(null)
    setActiveServings(undefined)
    setIsConfirmingPick(false)
    const draft: ManualDraft = {
      name: item.name ?? '',
      brand: item.brand ?? '',
      amount: String(item.amountKcal),
      protein: item.proteinG === undefined ? '' : String(item.proteinG),
      fat: item.fatG === undefined ? '' : String(item.fatG),
      carbs: item.carbsG === undefined ? '' : String(item.carbsG),
      fiber: item.fiberG === undefined ? '' : String(item.fiberG),
      sodium: item.sodiumMg === undefined ? '' : String(item.sodiumMg),
      potassium: item.potassiumMg === undefined ? '' : String(item.potassiumMg),
      magnesium: item.magnesiumMg === undefined ? '' : String(item.magnesiumMg),
      note: item.noteText ?? '',
      amountG: item.amountG === undefined ? '' : String(item.amountG),
      macroMode: 'perPortion',
      emotion: item.emotion,
      favorite: false,
    }
    portionScaleBaseRef.current = portionScaleBaseFromDraft(draft)
    setManualDraft(draft)
    setIsManualOpen(true)
  }

  function openManualAdd() {
    // Not a barcode-not-found path — don't attach a leftover scanned code.
    setPendingBarcode(null)
    setBarcodeNotFoundMessage(false)
    setEditingItemId(null)
    setActiveServings(undefined)
    setIsConfirmingPick(false)
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
      sodiumMg: value.sodiumMg,
      potassiumMg: value.potassiumMg,
      magnesiumMg: value.magnesiumMg,
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
      fiberG: sum.fiberG + (item.fiberG ?? 0),
    }),
    { kcal: 0, proteinG: 0, fatG: 0, carbsG: 0, fiberG: 0 },
  )

  // #663 — only facts this meal is the *first* one today to satisfy (the
  // "once per day per fact" cap).
  const newlySatisfiedFactIds = nutritionFactsEnabled
    ? evaluateMealNutritionFacts(totalsSoFar).filter(
        (id) => !alreadySatisfiedFactIds?.includes(id),
      )
    : []
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

  // #273/#645 — while confirming a search/recent/barcode pick (see
  // isConfirmingPick's own comment), the sheet's own "Today would be"
  // preview folds this draft's own prospective total in on top of
  // totalsSoFar — the pre-#645 confirm step's own activeTodayTotalPreview
  // did the same, just computed from a PickableItem's rates directly
  // instead of manualDraft. A from-scratch manual create or an
  // existing-item edit falls back to the plain preview above, unchanged.
  const pickedScaled = (() => {
    if (!isConfirmingPick) return null
    const amountNum = parseNumberInput(manualDraft.amount)
    if (!amountNum || amountNum <= 0) return null
    return manualDraft.macroMode === 'per100g'
      ? scaleFromPer100g(
          amountNum,
          parseOptionalMacro(manualDraft.protein),
          parseOptionalMacro(manualDraft.fat),
          parseOptionalMacro(manualDraft.carbs),
          manualDraft.amountG,
        )
      : totalFromPortion(
          amountNum,
          parseOptionalMacro(manualDraft.protein),
          parseOptionalMacro(manualDraft.fat),
          parseOptionalMacro(manualDraft.carbs),
          manualDraft.amountG,
        )
  })()
  const sheetTodayTotalPreview =
    pickedScaled && todayTotals
      ? t.dailyEntry.todayWouldBeLabel(
          `${formatNumber(todayTotals.kcal + totalsSoFar.kcal + pickedScaled.amountKcal, locale, 0)} ${t.dailyEntry.kcalUnit} · ${macrosSummaryTextCompact(
            todayTotals.proteinG + totalsSoFar.proteinG + (pickedScaled.proteinG ?? 0),
            todayTotals.fatG + totalsSoFar.fatG + (pickedScaled.fatG ?? 0),
            todayTotals.carbsG + totalsSoFar.carbsG + (pickedScaled.carbsG ?? 0),
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
      : (todayTotalPreview ?? undefined)
  const sheetTodayRemainingPreview =
    pickedScaled &&
    todayTotals !== undefined &&
    dailyCalorieTargetKcal !== undefined
      ? t.dailyEntry.todayRemainingWouldBeLabel(
          formatKcal(
            dailyCalorieTargetKcal -
              (todayTotals.kcal + totalsSoFar.kcal + pickedScaled.amountKcal),
            locale,
            t,
          ),
          formatKcal(dailyCalorieTargetKcal - todayTotals.kcal, locale, t),
        )
      : (todayRemainingPreview ?? undefined)

  // #519 — show barcode on the manual Add/Edit sheet when a scan is pending
  // or the dish name already matches a personal library item that has one.
  const manualSheetBarcode =
    pendingBarcode ??
    (manualDraft.name.trim()
      ? mealItems.find((item) => item.name === manualDraft.name.trim())
          ?.barcode
      : undefined)

  // #480 — rendered in two mutually exclusive spots: with the reaction
  // block above Done once the meal has an item, and on its own for an
  // empty meal. Typing the note *before* adding any food is a supported
  // flow (#129) — MealList keeps a new meal's note in its own state until
  // the first item creates the CalorieEntry — so gating it on items alone
  // would drop the field for exactly that case.
  const mealNoteField = (
    <Input
      type="text"
      aria-label={t.dailyEntry.mealNoteLabel}
      placeholder={t.dailyEntry.mealNotePlaceholder(mealLabel)}
      value={note}
      onChange={(e) => onNoteChange(e.target.value)}
      className="h-12 text-base"
    />
  )

  // #508 — whole-meal delete (#459) used to be a trash icon in the header,
  // one tap away from Close; a destructive action must not sit next to
  // dismiss. It's a quiet labelled secondary at the end of the body now,
  // above the Done footer (#775), with #459's two-step confirm unchanged.
  // Like `mealNoteField` above it renders in one of two mutually exclusive
  // spots. Only meaningful while editing an already-saved meal (MealList's
  // #461 overlay) — the in-progress "new meal" flow leaves onDeleteMeal
  // undefined.
  const deleteMealSection =
    onDeleteMeal && mealPosition !== undefined ? (
      isConfirmingMealDelete ? (
        <div className="flex items-center gap-2 rounded-xl bg-card p-3 ring-1 ring-foreground/10">
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
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={t.dailyEntry.deleteMealLabel(mealPosition)}
          className="self-start text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => setIsConfirmingMealDelete(true)}
        >
          <Trash2 aria-hidden="true" />
          {t.dailyEntry.deleteWholeMealButton}
        </Button>
      )
    ) : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="fullscreen"
        closeLabel={t.dailyEntry.closeFoodDialogLabel}
        // #513 — Close stays size-9 in the top-right; #730 grew the name/
        // time row to h-12 to match the dish sheet, but Close is not the
        // time widget and should not grow with it.
        closeClassName="top-[calc(env(safe-area-inset-top)+1.25rem)] size-9 [&_svg]:size-5"
        // #775 — do not use `sticky` for Done: it does not pin inside this
        // `fixed` + `overflow-y-auto` DialogContent (same as #280 on the
        // dish sheet). Flex column + inner scroll, footer `shrink-0`.
        // `pb-0` still cancels fullscreen bottom safe-area so the footer
        // can own that inset itself.
        className="flex flex-col overflow-hidden pb-0"
        onOpenAutoFocus={(event) => {
          // #487 — Radix FocusScope otherwise focuses the header
          // `type="time"` input on open, which presents the native time
          // picker on iOS/Safari. Time UI only after an explicit tap.
          event.preventDefault()
        }}
      >
        <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-2 pr-10">
          <Label htmlFor="add-meal-name">{t.dailyEntry.mealLabelFieldLabel}</Label>
          <div className="flex items-center justify-between gap-2">
            {/* #563 — editable meal name (Breakfast→Lunch etc.) in add/edit,
             * not only via Settings presets. DialogTitle stays for a11y /
             * Radix naming; the visible field is the labeled Input. */}
            <DialogTitle className="sr-only">{mealLabel}</DialogTitle>
            <Input
              id="add-meal-name"
              type="text"
              aria-label={t.dailyEntry.mealLabelFieldLabel}
              value={mealLabel}
              onChange={(e) => onMealLabelChange(e.target.value)}
              className="h-12 min-w-0 flex-1 text-lg font-medium"
            />
            {/* #508 — the header keeps the time control only; DialogContent's
             * own Close owns the top-right corner alone. The #117 clear
             * control now lives *inside* this field's border so it reads as
             * part of the time widget rather than a second bare ✕ beside
             * Close (the two were easy to confuse), and whole-meal delete
             * moved down next to the Done footer. */}
            <div className="flex h-12 shrink-0 items-center rounded-lg border border-input bg-transparent pr-1 transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30">
              <Input
                type="time"
                aria-label={t.dailyEntry.timeEatenLabel}
                value={timeEaten}
                onChange={(e) => onTimeEatenChange(e.target.value)}
                className="h-full w-24 border-transparent bg-transparent pr-0 focus-visible:border-transparent focus-visible:ring-0 dark:bg-transparent"
              />
              {/* App-level clear button (#117) — restored after being
               * dropped in the #454 rewrite; the native time picker's own
               * Reset control isn't reliable enough to depend on alone. */}
              {timeEaten && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label={t.dailyEntry.clearTimeLabel}
                  onClick={() => onTimeEatenChange('')}
                >
                  <X aria-hidden="true" className="size-3.5" />
                </Button>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {mealLabelSuggestions.map((name) => (
              <Button
                key={name}
                type="button"
                variant={mealLabel === name ? 'secondary' : 'outline'}
                size="sm"
                aria-pressed={mealLabel === name}
                onClick={() => onMealLabelChange(name)}
              >
                {name}
              </Button>
            ))}
          </div>
        </div>
        {/* #505 — one vertical scale (`gap-3`/`gap-4`) instead of mixed
         * `mt-2`/`mt-3`/`mt-4` between confirms, quantity step, and browse. */}
        <div className="mt-3 flex flex-col gap-4">
        {isConfirmingDiscard && onConfirmDiscard && onCancelDiscard && (
          <div className="flex flex-col gap-2 rounded-xl bg-card p-3 ring-1 ring-foreground/10">
            <span className="text-sm text-muted-foreground">
              {discardConfirmLabel ??
                t.dailyEntry.confirmDiscardInProgressMealLabel}
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={onConfirmDiscard}
              >
                {t.dailyEntry.confirmDiscardInProgressMealYes}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onCancelDiscard}
              >
                {t.dailyEntry.confirmDiscardInProgressMealNo}
              </Button>
            </div>
          </div>
        )}

        {confirmRemoveItemId && (
          // #544: was an inline banner at the top of the scrollable
          // Add-meal body — off-screen when the user deleted from meal
          // composition further down, so Remove looked like a no-op.
          // Fixed overlay (inside DialogContent so Radix modal
          // pointer-events still work) stays centered regardless of scroll.
          // Fullscreen DialogContent has no transform, so `fixed` is
          // viewport-relative.
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-remove-item-title"
          >
            <div className="w-full max-w-sm rounded-xl bg-card p-5 text-card-foreground shadow-lg ring-1 ring-foreground/10">
              <p
                id="confirm-remove-item-title"
                className="text-sm text-muted-foreground"
              >
                {t.dailyEntry.confirmDeleteItemLabel}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    onRemoveItem(confirmRemoveItemId)
                    setConfirmRemoveItemId(null)
                  }}
                >
                  {t.dailyEntry.confirmDeleteItemYes}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmRemoveItemId(null)}
                >
                  {t.dailyEntry.confirmDeleteItemNo}
                </Button>
              </div>
            </div>
          </div>
        )}

          <div className="flex flex-col gap-4">
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
            {eatingReasonTrackingEnabled && onEatingReasonsChange && (
              <EatingReasonPicker
                id="add-meal-eating-reason"
                value={eatingReasons}
                onChange={onEatingReasonsChange}
              />
            )}
            <div className="relative">
              <Input
                type="text"
                aria-label={t.dailyEntry.foodSearchLabel}
                placeholder={t.dailyEntry.foodSearchPlaceholder}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  clearOnlineSearch()
                }}
                className={cn(
                  'h-12 text-base',
                  search ? 'pr-20' : 'pr-11',
                )}
              />
              {search !== '' && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label={t.dailyEntry.clearFoodSearchLabel}
                  className="absolute top-1/2 right-10 -translate-y-1/2"
                  onClick={() => {
                    setSearch('')
                    clearOnlineSearch()
                  }}
                >
                  <X aria-hidden="true" className="size-3.5" />
                </Button>
              )}
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
              <div className="flex flex-col gap-3">
                {matches.length === 0 ? (
                  <div className="flex flex-col items-start gap-1.5">
                    <p className="text-sm text-muted-foreground">
                      {t.dailyEntry.noFoodResultsText}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="self-start"
                      onClick={openManualAdd}
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
                      openPickedItemSheet(item)
                    }}
                    t={t}
                    locale={locale}
                  />
                )}

                {/* #531/#535 — explicit online search (never per keystroke).
                 * Offline still runs the bundled RU staples catalog. */}
                {search.trim().length >= OFF_SEARCH_MIN_CHARS && (
                  <div className="flex flex-col gap-2 border-t border-border pt-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="self-start"
                      disabled={onlineSearchStatus === 'loading'}
                      onClick={() => {
                        void runOnlineSearch()
                      }}
                    >
                      {onlineSearchStatus === 'loading'
                        ? t.dailyEntry.searchingOnlineLabel
                        : t.dailyEntry.searchOnlineButton}
                    </Button>
                    {!isOnline && (
                      <p className="text-sm text-muted-foreground">
                        {t.dailyEntry.searchOnlineOfflineBundledHint}
                      </p>
                    )}
                    {onlineSearchStatus === 'done' &&
                      onlineRemoteStatus === 'unavailable' && (
                        <p className="text-sm text-muted-foreground">
                          {t.dailyEntry.onlineFoodUnavailableText}
                        </p>
                      )}
                    {onlineSearchStatus === 'done' &&
                      (onlineHits.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          {t.dailyEntry.noOnlineFoodResultsText}
                        </p>
                      ) : (
                        <div className="flex flex-col gap-1.5">
                          <span className="text-xs font-medium text-muted-foreground">
                            {t.dailyEntry.onlineFoodResultsHeading}
                          </span>
                          <ul className="flex flex-col gap-1">
                            {onlineHits.map((hit) => (
                              <li key={`${hit.code ?? hit.name}-${hit.kcal100}`}>
                                <button
                                  type="button"
                                  className="flex w-full flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-left hover:bg-muted"
                                  onClick={() => pickOnlineHit(hit)}
                                >
                                  <span className="text-sm font-medium text-foreground">
                                    {hit.brand
                                      ? `${hit.name} · ${hit.brand}`
                                      : hit.name}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {formatKcal(hit.kcal100, locale, t)}
                                    {' · '}
                                    {t.dailyEntry.per100gLabel}
                                  </span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* #459 — 3 prominent bordered cards, replacing the old
                 * small plain-text links at the bottom. "Scan barcode" is
                 * a deliberate second entry point alongside the search
                 * bar's own scan icon, matching the mockup exactly. */}
                <div className="grid grid-cols-3 gap-3">
                  <QuickActionCard
                    Icon={Utensils}
                    label={t.dailyEntry.quickActionAddFoodLabel}
                    onClick={openManualAdd}
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
                {recentItems.length > 0 && (
                  <div className="flex flex-col gap-3">
                    {/* #507 — eye toggle hides the whole Recent list; title
                     * + eye stay so it can be shown again (#238 lesson,
                     * same as SectionTitleWithToggle elsewhere). */}
                    <SectionTitleWithToggle
                      title={t.dailyEntry.recentFoodsLabel}
                      visible={recentVisible}
                      onToggle={toggleRecentVisible}
                      hideLabel={t.common.hideSectionLabel(
                        t.dailyEntry.recentFoodsLabel,
                      )}
                      showLabel={t.common.showSectionLabel(
                        t.dailyEntry.recentFoodsLabel,
                      )}
                      extraAction={
                        recentVisible &&
                        allMealItems.length > RECENT_COUNT ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setShowAllRecent((current) => !current)
                            }
                          >
                            {showAllRecent
                              ? t.dailyEntry.collapseRecentLabel
                              : t.dailyEntry.showAllRecentLabel}
                          </Button>
                        ) : undefined
                      }
                    />
                    {recentVisible && (
                      <PickableItemList
                        items={recentItems}
                        textFor={textFor}
                        isFavorite={isFavorite}
                        onToggleFavorite={handleToggleFavorite}
                        onPick={(item) => {
                          openPickedItemSheet(item)
                        }}
                        t={t}
                        locale={locale}
                      />
                    )}
                  </div>
                )}
                {items.length === 0 && mealNoteField}
              </>
            )}

            {/* #509 — edit overlay keeps Done when composition is emptied
             * so committing an empty draft can remove the saved meal;
             * new-meal still hides Done until at least one food exists. */}
            {(items.length > 0 || showDoneWhenEmpty) && (
              <div className="flex flex-col gap-3 border-t border-border pt-4">
                {items.length > 0 && (
                  <>
                <span className="text-sm font-medium text-muted-foreground">
                  {t.dailyEntry.mealSoFarLabel}
                </span>
                {/* #505 — Day meal-card dish rhythm: rounded-xl / p-4 /
                 * divide / py-3, name base + kcal xl + macros sm. */}
                <ul className="flex flex-col divide-y divide-foreground/15 rounded-xl border border-border p-4">
                  {items.map((item) => {
                    const itemMacros = macrosSummaryTextCompact(
                      item.proteinG,
                      item.fatG,
                      item.carbsG,
                      locale,
                      t,
                    )
                    return (
                      <li
                        key={item.id}
                        className="flex items-start justify-between gap-2 py-3 text-sm text-muted-foreground first:pt-0 last:pb-0"
                      >
                        <button
                          type="button"
                          className="flex min-w-0 flex-1 flex-col gap-0.5 text-left hover:underline"
                          onClick={() => startEditItem(item)}
                        >
                          <p className="text-base font-medium">
                            {item.name || t.dailyEntry.itemNamePlaceholder}
                          </p>
                          <p className="flex items-baseline gap-1.5">
                            <span className="text-xl font-semibold tabular-nums">
                              {formatNumber(item.amountKcal, locale, 0)}{' '}
                              {t.dailyEntry.kcalUnit}
                            </span>
                            {item.amountG !== undefined && (
                              <span>
                                · {formatMacroGrams(item.amountG, locale, t)}
                              </span>
                            )}
                          </p>
                          {itemMacros && <p>{itemMacros}</p>}
                        </button>
                        <span className="flex shrink-0 items-center gap-2">
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
                            onClick={() => setConfirmRemoveItemId(item.id)}
                          >
                            <Trash2 aria-hidden="true" />
                          </Button>
                        </span>
                      </li>
                    )
                  })}
                </ul>
                {todayTotalPreview && (
                  <p className="text-base text-muted-foreground">
                    {todayTotalPreview}
                  </p>
                )}
                {todayRemainingPreview && (
                  <p className="text-base text-muted-foreground">
                    {todayRemainingPreview}
                  </p>
                )}
                {newlySatisfiedFactIds.length > 0 && (
                  <div
                    role="status"
                    className="flex flex-col gap-1 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground"
                  >
                    {newlySatisfiedFactIds.map((factId) => (
                      <span key={factId}>{t.nutritionFacts[factId]}</span>
                    ))}
                  </div>
                )}
                {/* #480 (2nd pass) — meal note lives here with the
                 * reaction block (above Done), not under the quick-
                 * action cards. Placeholder is meal-aware copy, not
                 * the reaction's "Was it tasty?" wording.
                 * #775 — Done is a flex footer below this scroll region,
                 * so the old pb-20 sticky clearance is not needed. */}
                <div className="flex flex-col gap-3 pt-2 pb-4">
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
                  {mealNoteField}
                  {/* #508 — whole-meal delete lives down here, well away
                   * from the header's Close. #775's flex footer sits below
                   * the scroll region, so this no longer has to hide under
                   * a sticky strip. */}
                  {deleteMealSection}
                </div>
                  </>
                )}
                {items.length === 0 && showDoneWhenEmpty && (
                  <div className="flex flex-col gap-3 pb-4">
                    {deleteMealSection}
                  </div>
                )}
              </div>
            )}
            {/* #508 — an emptied saved meal has no "meal so far" block and
             * therefore no Done footer, so delete has to render here to
             * stay reachable at all — only when #509's edit empty-Done
             * path isn't already showing it above. */}
            {items.length === 0 && !showDoneWhenEmpty && deleteMealSection}
          </div>
        </div>
        </div>
        {(items.length > 0 || showDoneWhenEmpty) && (
          <div className="shrink-0 border-t border-border bg-card pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
            <Button
              type="button"
              size="xl"
              className="w-full"
              onClick={() => {
                // #491 — Done confirms keep; X / escape only call
                // onOpenChange(false), which MealList treats as discard
                // for an in-progress new meal. #509 — edit Done
                // flushes the draft the same way.
                onDone?.()
                onOpenChange(false)
              }}
            >
              {t.dailyEntry.doneAddingMealButton}
            </Button>
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
              portionScaleBaseRef.current = null
              setBarcodeNotFoundMessage(false)
              setEditingItemId(null)
              // #518 — abandoning the not-found create drops the held code
              // (saveManualDraft clears it earlier, after a successful touch).
              setPendingBarcode(null)
              setActiveServings(undefined)
              setServingMode('grams')
              setServingCount('1')
              setIsConfirmingPick(false)
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
          onAmountChange={(value) => patchManualDraftNutrition({ amount: value })}
          protein={manualDraft.protein}
          onProteinChange={(value) =>
            patchManualDraftNutrition({ protein: value })
          }
          fat={manualDraft.fat}
          onFatChange={(value) => patchManualDraftNutrition({ fat: value })}
          carbs={manualDraft.carbs}
          onCarbsChange={(value) => patchManualDraftNutrition({ carbs: value })}
          fiber={manualDraft.fiber}
          onFiberChange={(value) => patchManualDraftNutrition({ fiber: value })}
          showFiber={trackFiber}
          sodium={manualDraft.sodium}
          onSodiumChange={(value) =>
            patchManualDraftNutrition({ sodium: value })
          }
          potassium={manualDraft.potassium}
          onPotassiumChange={(value) =>
            patchManualDraftNutrition({ potassium: value })
          }
          magnesium={manualDraft.magnesium}
          onMagnesiumChange={(value) =>
            patchManualDraftNutrition({ magnesium: value })
          }
          showSodium={micronutrients.sodium}
          showPotassium={micronutrients.potassium}
          showMagnesium={micronutrients.magnesium}
          note={manualDraft.note}
          onNoteChange={(value) =>
            setManualDraft((draft) => ({ ...draft, note: value }))
          }
          amountG={manualDraft.amountG}
          onAmountGChange={changeManualDraftAmountG}
          onAmountGBlur={commitPortionScaleBase}
          macroMode={manualDraft.macroMode}
          onMacroModeChange={changeManualDraftMode}
          servings={activeServings}
          servingMode={servingMode}
          onServingModeChange={(mode) => {
            setServingMode(mode)
            if (mode !== 'grams') applyServingToAmountG(mode, servingCount)
          }}
          servingCount={servingCount}
          onServingCountChange={(value) => {
            setServingCount(value)
            if (servingMode !== 'grams') applyServingToAmountG(servingMode, value)
          }}
          mealItems={mealItems}
          onSelectMealItem={(item) => {
            if (item.lastAmountKcal === undefined) return
            setActiveServings(undefined)
            setServingMode('grams')
            const rates = ratesFromAbsolute(
              item.lastAmountKcal,
              item.lastProteinG,
              item.lastFatG,
              item.lastCarbsG,
              item.lastAmountG,
              item.lastFiberG,
              item.lastSodiumMg,
              item.lastPotassiumMg,
              item.lastMagnesiumMg,
            )
            portionScaleBaseRef.current = null
            setManualDraft((draft) => ({
              ...draft,
              amount: String(rates.kcal100),
              protein:
                rates.protein100 === undefined ? '' : String(rates.protein100),
              fat: rates.fat100 === undefined ? '' : String(rates.fat100),
              carbs: rates.carbs100 === undefined ? '' : String(rates.carbs100),
              fiber: rates.fiber100 === undefined ? '' : String(rates.fiber100),
              sodium:
                rates.sodium100 === undefined ? '' : String(rates.sodium100),
              potassium:
                rates.potassium100 === undefined
                  ? ''
                  : String(rates.potassium100),
              magnesium:
                rates.magnesium100 === undefined
                  ? ''
                  : String(rates.magnesium100),
              amountG: String(rates.portions),
              // #715 — ratesFromAbsolute fills per-100g fields; stay in that mode.
              macroMode: 'per100g',
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
          todayTotalPreview={sheetTodayTotalPreview}
          todayRemainingPreview={sheetTodayRemainingPreview}
          infoMessage={
            barcodeNotFoundMessage
              ? t.dailyEntry.noFoodFoundForBarcodeMessage
              : undefined
          }
          barcode={manualSheetBarcode}
          requireName={pendingBarcode !== null && editingItemId === null}
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
      // #505 — stay quieter than meal title + dish kcal heroes.
      className="flex flex-col items-center gap-1.5 rounded-xl border border-border p-3 text-center text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
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
    // #505 — Day-card list rhythm for Recent / search matches: rounded-xl
    // shell, divide rows, name base / secondary sm (kcal hero stays on
    // composition + quantity preview, not every catalog row).
    <ul className="flex max-h-72 flex-col divide-y divide-foreground/15 overflow-y-auto rounded-xl border border-border p-4">
      {items.map((item) => (
        <li
          key={itemKey(item)}
          className="flex items-stretch py-3 first:pt-0 last:pb-0"
        >
          <button
            type="button"
            className="flex w-full min-w-0 items-start gap-2 text-left text-sm text-muted-foreground hover:bg-muted"
            onClick={() => onPick(item)}
          >
            <span className="flex min-w-0 flex-col gap-0.5">
              {item.source === 'food' ? (
                <>
                  <span className="text-base font-medium">
                    {item.food[locale]}
                  </span>
                  <span>
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
                  <span className="text-base font-medium">
                    {item.mealItem.name}
                  </span>
                  <span>
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
