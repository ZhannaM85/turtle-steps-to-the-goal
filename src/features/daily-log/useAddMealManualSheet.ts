import { useRef, useState } from 'react'
import type { FoodServing } from '@/data/foods'
import type { CalorieItem } from '@/domain/dailyEntry'
import type { MealItem } from '@/domain/mealItem'
import type { Locale } from '@/i18n'
import {
  parseOptionalMacro,
  scaleFromPer100g,
  totalFromPortion,
} from '@/shared/lib/macroScaling'
import { parseNumberInput } from '@/shared/lib/parseNumberInput'
import { normalizeTextSpaces } from '@/shared/lib/normalizeTextSpaces'
import { foodItemFromOff } from './foodItemFromOff'
import { lookupBarcode } from './lookupBarcode'
import {
  applyManualDraftModeChange,
  applyPortionWeightToDraft,
  applyServingGramsToDraft,
  blankManualDraft,
  curatedFoodNames,
  draftFromCalorieItem,
  draftFromPickableItem,
  libraryPickRatesPatch,
  portionScaleBaseFromDraft,
  servingsForPickableItem,
  type ManualDraft,
  type PickableItem,
  type PortionScaleBase,
} from './addMealDialogHelpers'
import { IndexedDbMealItemRepository } from '@/infrastructure/persistence/indexeddb'

const mealItemRepositoryForBarcodeLookup = new IndexedDbMealItemRepository()

export function useAddMealManualSheet({
  locale,
  isOnline,
  onAppendItems,
  onUpdateItem,
  touchMealItem,
  setSearch,
}: {
  locale: Locale
  isOnline: boolean
  onAppendItems: (items: CalorieItem[]) => void
  onUpdateItem?: (item: CalorieItem) => void
  touchMealItem: (
    name: string,
    macros: {
      amountKcal: number
      proteinG?: number
      fatG?: number
      carbsG?: number
      fiberG?: number
      amountG?: number
      sodiumMg?: number
      potassiumMg?: number
      magnesiumMg?: number
    },
    favorite?: boolean,
    barcode?: string,
  ) => Promise<unknown> | unknown
  setSearch: (value: string) => void
}) {
  const [activeServings, setActiveServings] = useState<
    FoodServing[] | undefined
  >(undefined)
  const [servingMode, setServingMode] = useState('grams')
  const [servingCount, setServingCount] = useState('1')
  const [isConfirmingPick, setIsConfirmingPick] = useState(false)
  const [isManualOpen, setIsManualOpen] = useState(false)
  const [manualDraft, setManualDraft] = useState(blankManualDraft)
  const portionScaleBaseRef = useRef<PortionScaleBase | null>(null)
  const [barcodeNotFoundMessage, setBarcodeNotFoundMessage] = useState(false)
  const [pendingBarcode, setPendingBarcode] = useState<string | null>(null)
  const pendingManualOpenAfterBarcodeRef = useRef(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)

  function openPickedItemSheet(
    item: PickableItem,
    options?: {
      brandOverride?: string
      barcodeOverride?: string
      deferOpen?: boolean
    },
  ) {
    setEditingItemId(null)
    setBarcodeNotFoundMessage(false)
    setPendingBarcode(options?.barcodeOverride ?? null)
    setServingMode('grams')
    setServingCount('1')
    setActiveServings(servingsForPickableItem(item))
    setIsConfirmingPick(true)
    const next = draftFromPickableItem(item, locale, options?.brandOverride)
    portionScaleBaseRef.current = next.portionScaleBase
    setManualDraft(next.draft)
    if (options?.deferOpen) {
      pendingManualOpenAfterBarcodeRef.current = true
      return
    }
    setIsManualOpen(true)
  }

  function applyServingToAmountG(servingIndexRaw: string, countRaw: string) {
    const serving = activeServings?.[Number(servingIndexRaw)]
    if (!serving) return
    const countNum = parseNumberInput(countRaw)
    const count = countNum && countNum > 0 ? countNum : 1
    const grams = serving.grams * count
    setManualDraft((draft) => {
      const next = applyServingGramsToDraft(
        draft,
        grams,
        portionScaleBaseRef.current,
      )
      portionScaleBaseRef.current = next.portionScaleBase
      return next.draft
    })
  }

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
      openPickedItemSheet(item, {
        barcodeOverride: barcode,
        deferOpen: true,
      })
    } else if (result.source === 'openFoodFacts') {
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
        {
          brandOverride: result.brand,
          barcodeOverride: barcode,
          deferOpen: true,
        },
      )
    } else {
      setActiveServings(undefined)
      setIsConfirmingPick(false)
      setPendingBarcode(barcode)
      setBarcodeNotFoundMessage(true)
      pendingManualOpenAfterBarcodeRef.current = true
    }
  }

  function changeManualDraftMode(newMode: 'per100g' | 'perPortion') {
    setManualDraft((draft) => {
      if (draft.macroMode === newMode) return draft
      const next = applyManualDraftModeChange(draft, newMode)
      portionScaleBaseRef.current = next.portionScaleBase
      return next.draft
    })
  }

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
      if (next.macroMode === 'perPortion') {
        portionScaleBaseRef.current = portionScaleBaseFromDraft(next)
      }
      return next
    })
  }

  function saveManualDraft() {
    const amountNum = parseNumberInput(manualDraft.amount)
    if (!amountNum || amountNum <= 0) return
    const trimmedName = normalizeTextSpaces(manualDraft.name).trim()
    if (pendingBarcode && !trimmedName) return
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
      setSearch('')
    }
    const shouldTouch =
      !!trimmedName &&
      (!!barcodeToSave || !curatedFoodNames.has(trimmedName))
    setPendingBarcode(null)
    setManualDraft(blankManualDraft())
    setEditingItemId(null)
    setIsManualOpen(false)
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

  function startEditItem(item: CalorieItem) {
    setEditingItemId(item.id)
    setPendingBarcode(null)
    setActiveServings(undefined)
    setIsConfirmingPick(false)
    const draft = draftFromCalorieItem(item)
    portionScaleBaseRef.current = portionScaleBaseFromDraft(draft)
    setManualDraft(draft)
    setIsManualOpen(true)
  }

  function openManualAdd(initialName?: string) {
    setPendingBarcode(null)
    setBarcodeNotFoundMessage(false)
    setEditingItemId(null)
    setActiveServings(undefined)
    setIsConfirmingPick(false)
    // #992 — empty-search «Добавить вручную» passes the typed query.
    // Other callers omit it, so those paths still open a blank name.
    const name = typeof initialName === 'string' ? initialName.trim() : ''
    if (name) {
      portionScaleBaseRef.current = null
      setManualDraft({ ...blankManualDraft(), name })
    }
    setIsManualOpen(true)
  }

  function handleManualSheetOpenChange(next: boolean) {
    setIsManualOpen(next)
    if (!next) {
      setManualDraft(blankManualDraft())
      portionScaleBaseRef.current = null
      setBarcodeNotFoundMessage(false)
      setEditingItemId(null)
      setPendingBarcode(null)
      setActiveServings(undefined)
      setServingMode('grams')
      setServingCount('1')
      setIsConfirmingPick(false)
    }
  }

  function handleBarcodeDialogOpenChange(open: boolean) {
    if (!open && pendingManualOpenAfterBarcodeRef.current) {
      pendingManualOpenAfterBarcodeRef.current = false
      setIsManualOpen(true)
    }
  }

  function applyLibraryPick(item: MealItem) {
    const patch = libraryPickRatesPatch(item)
    if (!patch) return
    setActiveServings(undefined)
    setServingMode('grams')
    portionScaleBaseRef.current = null
    setManualDraft((draft) => ({ ...draft, ...patch }))
  }

  function touchIfPersonal(item: CalorieItem) {
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

  return {
    activeServings,
    servingMode,
    setServingMode,
    servingCount,
    setServingCount,
    isConfirmingPick,
    isManualOpen,
    manualDraft,
    setManualDraft,
    barcodeNotFoundMessage,
    pendingBarcode,
    editingItemId,
    openPickedItemSheet,
    applyServingToAmountG,
    handleScanned,
    changeManualDraftMode,
    changeManualDraftAmountG,
    commitPortionScaleBase,
    patchManualDraftNutrition,
    saveManualDraft,
    startEditItem,
    openManualAdd,
    handleManualSheetOpenChange,
    handleBarcodeDialogOpenChange,
    applyLibraryPick,
    touchIfPersonal,
  }
}
