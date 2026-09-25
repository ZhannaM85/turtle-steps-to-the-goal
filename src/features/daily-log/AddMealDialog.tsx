import { useEffect, useState } from 'react'
import type { CalorieItem, Emotion } from '@/domain/dailyEntry'
import { type NutritionFactId } from '@/domain/nutritionFacts'
import { useLocale, useTranslation } from '@/i18n'
import { mealLabelSuggestionsForLocale } from '@/shared/lib/mealLabel'
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
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent } from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { useFoodShareUiStore } from '@/features/food-share'
import { LogRecipeDialog } from '@/features/recipes'
import { BarcodeScannerDialog } from './BarcodeScannerDialog'
import { EatingReasonPicker } from './EatingReasonPicker'
import type { PickedFoodValues } from './FoodPickerDialog'
import { RepeatMealDialog } from './RepeatMealDialog'
import { calorieItemFromImportedFood } from './addMealDialogHelpers'
import { addMealDialogPreviews } from './addMealDialogPreviews'
import { AddMealDialogBrowse } from './AddMealDialogBrowse'
import { AddMealDialogNotices } from './AddMealDialogNotices'
import { AddMealDialogComposition } from './AddMealDialogComposition'
import { AddMealDialogEditorSheet } from './AddMealDialogEditorSheet'
import { AddMealDialogHeader } from './AddMealDialogHeader'
import { useAddMealCatalog } from './useAddMealCatalog'
import { useAddMealManualSheet } from './useAddMealManualSheet'
import { useMealCompositionActions } from './useMealCompositionActions'

export interface AddMealDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDone?: () => void
  isConfirmingDiscard?: boolean
  onConfirmDiscard?: () => void
  onCancelDiscard?: () => void
  discardConfirmLabel?: string
  showDoneWhenEmpty?: boolean
  mealLabel: string
  onMealLabelChange: (value: string) => void
  mealPosition?: number
  timeEaten: string
  onTimeEatenChange: (value: string) => void
  note: string
  onNoteChange: (value: string) => void
  previousMeal?: { label?: string; items: CalorieItem[] }
  items: CalorieItem[]
  reaction: Emotion | undefined
  onReactionChange: (reaction: Emotion | undefined) => void
  eatingReasons?: string[]
  onEatingReasonsChange?: (reasons: string[]) => void
  onAppendItems: (items: CalorieItem[]) => void
  onRemoveItem: (itemId: string) => void
  onUpdateItem?: (item: CalorieItem) => void
  /** #987 — drop the foods used to build a recipe and insert that recipe line. */
  onReplaceItems?: (removeIds: readonly string[], added: CalorieItem) => void
  onDeleteMeal?: () => void
  todayTotals?: {
    kcal: number
    proteinG: number
    fatG: number
    carbsG: number
  }
  dailyCalorieTargetKcal?: number
  alreadySatisfiedFactIds?: NutritionFactId[]
}

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
  onReplaceItems,
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
  const touchMealItem = useMealItemStore((state) => state.touch)
  const recipes = useRecipeStore((state) => state.recipes)
  const loadRecipes = useRecipeStore((state) => state.loadRecipes)
  const loadFoodOverrides = useFoodOverrideStore((state) => state.loadOverrides)
  const recentVisible = useAddMealRecentVisibilityStore(
    (state) => state.recentVisible,
  )
  const toggleRecentVisible = useAddMealRecentVisibilityStore(
    (state) => state.toggleRecentVisible,
  )
  const mealLabelPresets = useMealLabelPresetStore((state) => state.presets)
  const addMealLabelPreset = useMealLabelPresetStore((state) => state.addPreset)
  const micronutrients = useMicronutrientTrackingStore((state) => state.tracked)
  const trackFiber = useTrackedFieldsStore((state) => state.tracked.fiber)
  const nutritionFactsEnabled = useNutritionFactsStore((state) => state.enabled)
  const mealLabelSuggestions = mealLabelSuggestionsForLocale(
    t,
    mealLabelPresets,
  )

  useEffect(() => {
    loadRecipes()
    loadFoodOverrides()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    return () => {
      useFoodShareUiStore.getState().setOnImported(null)
    }
  }, [])

  const [search, setSearch] = useState('')
  const [isRepeatOpen, setIsRepeatOpen] = useState(false)
  const [isRecipeOpen, setIsRecipeOpen] = useState(false)
  const [isBarcodeOpen, setIsBarcodeOpen] = useState(false)
  const [isConfirmingMealDelete, setIsConfirmingMealDelete] = useState(false)
  const [confirmRemoveItemId, setConfirmRemoveItemId] = useState<string | null>(
    null,
  )

  const sheet = useAddMealManualSheet({
    locale,
    isOnline,
    onAppendItems,
    onUpdateItem,
    touchMealItem,
    setSearch,
  })
  const catalog = useAddMealCatalog({
    locale,
    isOnline,
    search,
    setSearch,
    openPickedItemSheet: sheet.openPickedItemSheet,
  })

  function handleRepeatConfirm(selected: CalorieItem[]) {
    if (selected.length === 0) return
    const cloned = selected.map((item) => ({
      ...item,
      id: crypto.randomUUID(),
      emotion: undefined,
    }))
    onAppendItems(cloned)
    for (const item of cloned) sheet.touchIfPersonal(item)
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

  const {
    newlySatisfiedFactIds,
    todayTotalPreview,
    todayRemainingPreview,
    sheetTodayTotalPreview,
    sheetTodayRemainingPreview,
  } = addMealDialogPreviews({
    items,
    todayTotals,
    dailyCalorieTargetKcal,
    alreadySatisfiedFactIds,
    nutritionFactsEnabled,
    isConfirmingPick: sheet.isConfirmingPick,
    manualDraft: sheet.manualDraft,
    t,
    locale,
  })
  const compositionActions = useMealCompositionActions(
    catalog.mealItems,
    onReplaceItems,
  )
  const manualSheetBarcode =
    sheet.pendingBarcode ??
    (sheet.manualDraft.name.trim()
      ? catalog.mealItems.find(
          (item) => item.name === sheet.manualDraft.name.trim(),
        )?.barcode
      : undefined)

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

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          size="fullscreen"
          closeLabel={t.dailyEntry.closeFoodDialogLabel}
          closeClassName="top-[calc(env(safe-area-inset-top)+1.25rem)] size-9 [&_svg]:size-5"
          className="flex flex-col overflow-hidden pb-0"
          onOpenAutoFocus={(event) => {
            event.preventDefault()
          }}
        >
          <div className="min-h-0 flex-1 overflow-y-auto">
            <AddMealDialogHeader
              mealLabel={mealLabel}
              onMealLabelChange={onMealLabelChange}
              timeEaten={timeEaten}
              onTimeEatenChange={onTimeEatenChange}
              mealLabelSuggestions={mealLabelSuggestions}
              onSaveMealNameAsTemplate={addMealLabelPreset}
            />
            <div className="mt-3 flex flex-col gap-4">
              <AddMealDialogNotices
                isConfirmingDiscard={isConfirmingDiscard}
                onConfirmDiscard={onConfirmDiscard}
                onCancelDiscard={onCancelDiscard}
                discardConfirmLabel={discardConfirmLabel}
                confirmRemoveItemId={confirmRemoveItemId}
                onConfirmRemoveItem={(itemId) => {
                  onRemoveItem(itemId)
                  setConfirmRemoveItemId(null)
                }}
                onCancelRemoveItem={() => setConfirmRemoveItemId(null)}
              />
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
                <AddMealDialogBrowse
                  mealLabel={mealLabel}
                  search={search}
                  query={catalog.query}
                  matches={catalog.matches}
                  recentItems={catalog.recentItems}
                  allMealItemsCount={catalog.allMealItems.length}
                  recentCount={catalog.recentCount}
                  showAllRecent={catalog.showAllRecent}
                  onToggleShowAllRecent={() =>
                    catalog.setShowAllRecent((current) => !current)
                  }
                  recentVisible={recentVisible}
                  onToggleRecentVisible={toggleRecentVisible}
                  textFor={catalog.textFor}
                  isFavorite={catalog.isFavorite}
                  onToggleFavorite={catalog.handleToggleFavorite}
                  onPick={sheet.openPickedItemSheet}
                  onOpenManualAdd={sheet.openManualAdd}
                  onOpenBarcode={() => setIsBarcodeOpen(true)}
                  onOpenRecipe={() => setIsRecipeOpen(true)}
                  onImportSharedFood={() => {
                    useFoodShareUiStore.getState().setOnImported((result) => {
                      const item = calorieItemFromImportedFood(result)
                      if (item) onAppendItems([item])
                    })
                    useFoodShareUiStore.getState().setEntryOpen(true)
                  }}
                  onlineHits={catalog.onlineHits}
                  onlineSearchStatus={catalog.onlineSearchStatus}
                  onlineRemoteStatus={catalog.onlineRemoteStatus}
                  onRunOnlineSearch={() => {
                    void catalog.runOnlineSearch()
                  }}
                  onPickOnlineHit={catalog.pickOnlineHit}
                  onChangeSearch={catalog.changeSearch}
                  onClearSearch={catalog.clearSearch}
                  mealNoteField={mealNoteField}
                  showEmptyMealNote={items.length === 0}
                />
                <AddMealDialogComposition
                  items={items}
                  mealLabel={mealLabel}
                  reaction={reaction}
                  onReactionChange={onReactionChange}
                  mealNoteField={mealNoteField}
                  showDoneWhenEmpty={showDoneWhenEmpty}
                  todayTotalPreview={todayTotalPreview}
                  todayRemainingPreview={todayRemainingPreview}
                  newlySatisfiedFactIds={newlySatisfiedFactIds}
                  onStartEditItem={sheet.startEditItem}
                  onShareItem={compositionActions.shareOne}
                  onShareComposition={() => compositionActions.shareMany(items)}
                  onShareSelected={compositionActions.shareMany}
                  onCreateRecipe={compositionActions.openRecipe}
                  onRequestRemoveItem={setConfirmRemoveItemId}
                  onDeleteMeal={onDeleteMeal}
                  mealPosition={mealPosition}
                  isConfirmingMealDelete={isConfirmingMealDelete}
                  onConfirmingMealDeleteChange={setIsConfirmingMealDelete}
                />
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
              onOpenChange={(next) => {
                setIsBarcodeOpen(next)
                sheet.handleBarcodeDialogOpenChange(next)
              }}
              onScanned={sheet.handleScanned}
            />
          )}
          <AddMealDialogEditorSheet
            open={sheet.isManualOpen}
            onOpenChange={sheet.handleManualSheetOpenChange}
            editingItemId={sheet.editingItemId}
            draft={sheet.manualDraft}
            onNameChange={(value) =>
              sheet.setManualDraft((draft) => ({ ...draft, name: value }))
            }
            onBrandChange={(value) =>
              sheet.setManualDraft((draft) => ({ ...draft, brand: value }))
            }
            onNoteChange={(value) =>
              sheet.setManualDraft((draft) => ({ ...draft, note: value }))
            }
            onEmotionChange={(value) =>
              sheet.setManualDraft((draft) => ({ ...draft, emotion: value }))
            }
            onFavoriteChange={(value) =>
              sheet.setManualDraft((draft) => ({ ...draft, favorite: value }))
            }
            patchNutrition={sheet.patchManualDraftNutrition}
            onAmountGChange={sheet.changeManualDraftAmountG}
            onAmountGBlur={sheet.commitPortionScaleBase}
            onMacroModeChange={sheet.changeManualDraftMode}
            activeServings={sheet.activeServings}
            servingMode={sheet.servingMode}
            servingCount={sheet.servingCount}
            onServingModeChange={(mode) => {
              sheet.setServingMode(mode)
              if (mode !== 'grams')
                sheet.applyServingToAmountG(mode, sheet.servingCount)
            }}
            onServingCountChange={(value) => {
              sheet.setServingCount(value)
              if (sheet.servingMode !== 'grams')
                sheet.applyServingToAmountG(sheet.servingMode, value)
            }}
            mealItems={catalog.mealItems}
            onSelectMealItem={sheet.applyLibraryPick}
            trackFiber={trackFiber}
            showSodium={micronutrients.sodium}
            showPotassium={micronutrients.potassium}
            showMagnesium={micronutrients.magnesium}
            todayTotalPreview={sheetTodayTotalPreview}
            todayRemainingPreview={sheetTodayRemainingPreview}
            barcodeNotFoundMessage={sheet.barcodeNotFoundMessage}
            barcode={manualSheetBarcode}
            requireName={
              sheet.pendingBarcode !== null && sheet.editingItemId === null
            }
            onSave={sheet.saveManualDraft}
          />
        </DialogContent>
      </Dialog>
      {compositionActions.dialogs}
    </>
  )
}
