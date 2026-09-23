import { type FoodItem, type FoodServing, foods } from '@/data/foods'
import type { CalorieItem, MealEmotion } from '@/domain/dailyEntry'
import type { MealItem } from '@/domain/mealItem'
import type { Locale } from '@/i18n'
import type { SharedFoodImportResult } from '@/features/food-share'
import {
  gramsToPortions,
  parseOptionalMacro,
  portionsToGrams,
  ratesFromAbsolute,
  scaleFromPer100g,
  scaleTotalsByWeightChange,
} from '@/shared/lib/macroScaling'
import { parseNumberInput } from '@/shared/lib/parseNumberInput'

export const curatedFoodNames = new Set(
  foods.flatMap((food) => [food.en, food.ru]),
)

export type PickableItem =
  | { source: 'food'; food: FoodItem }
  | { source: 'mealItem'; mealItem: MealItem & { lastAmountKcal: number } }

export function itemKey(item: PickableItem): string {
  return item.source === 'food' ? `food-${item.food.id}` : `meal-${item.mealItem.id}`
}

// #264 — a curated food has no "last used" quantity of its own, so 100g
// (its per-100g reference amount) is the sensible default; a personal item
// defaults to its own last-logged amount. Same logic as FoodPickerDialog's
// own defaultQuantityFor (now only used by the separate recipe-log flow,
// #645) — duplicated rather than shared, for one small pure function.
export function defaultQuantityFor(item: PickableItem): string {
  if (item.source === 'mealItem' && item.mealItem.lastAmountG !== undefined) {
    return String(item.mealItem.lastAmountG)
  }
  return '100'
}

export function blankManualDraft() {
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

export type ManualDraft = ReturnType<typeof blankManualDraft>

/** #802 — turn a confirmed shared-food import into a meal line. Skip when
 * kcal is blank so we don't add a 0-kcal junk row. */
export function calorieItemFromImportedFood(
  result: SharedFoodImportResult,
): CalorieItem | null {
  const name = result.name.trim()
  const amountKcal = result.nutrition.amountKcal
  if (!name || amountKcal === undefined || !Number.isFinite(amountKcal)) {
    return null
  }
  return {
    id: crypto.randomUUID(),
    name,
    brand: result.brand,
    amountKcal,
    proteinG: result.nutrition.proteinG,
    fatG: result.nutrition.fatG,
    carbsG: result.nutrition.carbsG,
    amountG: result.nutrition.amountG,
  }
}

/** #715 — fixed density baseline for Portion-mode weight edits. Scaling
 * from the previous keystroke's grams breaks while typing ("50" → "5" →
 * "20"); always multiply from the last committed nutrition+weight pair. */
export type PortionScaleBase = {
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

export function portionScaleBaseFromDraft(
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

export function applyPortionWeightToDraft(
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

export function draftFromPickableItem(
  item: PickableItem,
  locale: Locale,
  brandOverride?: string,
): { draft: ManualDraft; portionScaleBase: PortionScaleBase | null } {
  if (item.source === 'food') {
    const { food } = item
    return {
      draft: {
        name: food[locale],
        brand: brandOverride ?? '',
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
        macroMode: 'per100g',
        emotion: undefined,
        favorite: false,
      },
      portionScaleBase: null,
    }
  }
  const { mealItem } = item
  const lastGrams = mealItem.lastAmountG
  if (
    lastGrams !== undefined &&
    lastGrams > 0 &&
    mealItem.lastAmountKcal !== undefined
  ) {
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
    return {
      draft: {
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
      },
      portionScaleBase: null,
    }
  }
  const draft: ManualDraft = {
    name: mealItem.name,
    brand: '',
    amount: String(mealItem.lastAmountKcal),
    protein:
      mealItem.lastProteinG === undefined ? '' : String(mealItem.lastProteinG),
    fat: mealItem.lastFatG === undefined ? '' : String(mealItem.lastFatG),
    carbs:
      mealItem.lastCarbsG === undefined ? '' : String(mealItem.lastCarbsG),
    fiber:
      mealItem.lastFiberG === undefined ? '' : String(mealItem.lastFiberG),
    sodium:
      mealItem.lastSodiumMg === undefined ? '' : String(mealItem.lastSodiumMg),
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
  return { draft, portionScaleBase: portionScaleBaseFromDraft(draft) }
}

export function applyManualDraftModeChange(
  draft: ManualDraft,
  newMode: 'per100g' | 'perPortion',
): { draft: ManualDraft; portionScaleBase: PortionScaleBase | null } {
  if (draft.macroMode === newMode) {
    return { draft, portionScaleBase: portionScaleBaseFromDraft(draft) }
  }
  const convertedAmountG =
    newMode === 'perPortion'
      ? String(portionsToGrams(draft.amountG) ?? '')
      : String(gramsToPortions(draft.amountG))
  const amountNum = parseNumberInput(draft.amount)
  if (!amountNum || amountNum <= 0) {
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
    return { draft: next, portionScaleBase: portionScaleBaseFromDraft(next) }
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
    return { draft: next, portionScaleBase: portionScaleBaseFromDraft(next) }
  }
  const rates = ratesFromAbsolute(
    amountNum,
    parseOptionalMacro(draft.protein),
    parseOptionalMacro(draft.fat),
    parseOptionalMacro(draft.carbs),
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
  return { draft: next, portionScaleBase: null }
}

export function applyServingGramsToDraft(
  draft: ManualDraft,
  grams: number,
  portionScaleBase: PortionScaleBase | null,
): { draft: ManualDraft; portionScaleBase: PortionScaleBase | null } {
  if (draft.macroMode === 'perPortion') {
    const next = applyPortionWeightToDraft(
      draft,
      String(grams),
      portionScaleBase,
    )
    return { draft: next, portionScaleBase: portionScaleBaseFromDraft(next) }
  }
  return {
    draft: {
      ...draft,
      amountG: String(gramsToPortions(String(grams))),
    },
    portionScaleBase,
  }
}

/**
 * #981 — edit (and a QR-imported line, which is edited the same way) opens
 * on 100 g. Logged rows store absolute totals; `ratesFromAbsolute` turns
 * those back into a per-100g rate plus a × 100 g count. Missing grams are
 * treated as one 100 g portion, same as Settings' food editor. Switching
 * to Порция still goes through `applyManualDraftModeChange`.
 */
export function draftFromCalorieItem(item: CalorieItem): ManualDraft {
  const rates = ratesFromAbsolute(
    item.amountKcal,
    item.proteinG,
    item.fatG,
    item.carbsG,
    item.amountG,
    item.fiberG,
    item.sodiumMg,
    item.potassiumMg,
    item.magnesiumMg,
  )
  return {
    name: item.name ?? '',
    brand: item.brand ?? '',
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
    note: item.noteText ?? '',
    amountG: String(rates.portions),
    macroMode: 'per100g',
    emotion: item.emotion,
    favorite: false,
  }
}

export function servingsForPickableItem(
  item: PickableItem,
): FoodServing[] | undefined {
  return item.source === 'food' ? item.food.servings : undefined
}

export function libraryPickRatesPatch(
  item: MealItem,
): Partial<ManualDraft> | null {
  if (item.lastAmountKcal === undefined) return null
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
  return {
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
    amountG: String(rates.portions),
    macroMode: 'per100g',
  }
}
