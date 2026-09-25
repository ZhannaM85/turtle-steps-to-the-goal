import type { FoodServing } from '@/data/foods'
import type { MealItem } from '@/domain/mealItem'
import { useTranslation } from '@/i18n'
import { MealItemEditorSheet } from './MealItemEditorSheet'
import type { ManualDraft } from './addMealDialogHelpers'

export function AddMealDialogEditorSheet({
  open,
  onOpenChange,
  editingItemId,
  draft,
  onNameChange,
  onBrandChange,
  onHomemadeChange,
  onNoteChange,
  onEmotionChange,
  onFavoriteChange,
  patchNutrition,
  onAmountGChange,
  onAmountGBlur,
  onMacroModeChange,
  activeServings,
  servingMode,
  servingCount,
  onServingModeChange,
  onServingCountChange,
  mealItems,
  onSelectMealItem,
  trackFiber,
  showSodium,
  showPotassium,
  showMagnesium,
  todayTotalPreview,
  todayRemainingPreview,
  barcodeNotFoundMessage,
  barcode,
  requireName,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingItemId: string | null
  draft: ManualDraft
  onNameChange: (value: string) => void
  onBrandChange: (value: string) => void
  onHomemadeChange: (value: boolean) => void
  onNoteChange: (value: string) => void
  onEmotionChange: (value: ManualDraft['emotion']) => void
  onFavoriteChange: (value: boolean) => void
  patchNutrition: (
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
  ) => void
  onAmountGChange: (value: string) => void
  onAmountGBlur: () => void
  onMacroModeChange: (mode: 'per100g' | 'perPortion') => void
  activeServings: FoodServing[] | undefined
  servingMode: string
  servingCount: string
  onServingModeChange: (mode: string) => void
  onServingCountChange: (value: string) => void
  mealItems: MealItem[]
  onSelectMealItem: (item: MealItem) => void
  trackFiber: boolean
  showSodium: boolean
  showPotassium: boolean
  showMagnesium: boolean
  todayTotalPreview?: string
  todayRemainingPreview?: string
  barcodeNotFoundMessage: boolean
  barcode?: string
  requireName: boolean
  onSave: () => void
}) {
  const t = useTranslation()
  return (
    <MealItemEditorSheet
      open={open}
      onOpenChange={onOpenChange}
      title={
        editingItemId
          ? t.dailyEntry.editItemSheetTitle
          : t.dailyEntry.addItemSheetTitle
      }
      autoFocusName={!editingItemId}
      name={draft.name}
      onNameChange={onNameChange}
      brand={draft.brand}
      onBrandChange={onBrandChange}
      homemade={draft.homemade}
      onHomemadeChange={onHomemadeChange}
      amount={draft.amount}
      onAmountChange={(value) => patchNutrition({ amount: value })}
      protein={draft.protein}
      onProteinChange={(value) => patchNutrition({ protein: value })}
      fat={draft.fat}
      onFatChange={(value) => patchNutrition({ fat: value })}
      carbs={draft.carbs}
      onCarbsChange={(value) => patchNutrition({ carbs: value })}
      fiber={draft.fiber}
      onFiberChange={(value) => patchNutrition({ fiber: value })}
      showFiber={trackFiber}
      sodium={draft.sodium}
      onSodiumChange={(value) => patchNutrition({ sodium: value })}
      potassium={draft.potassium}
      onPotassiumChange={(value) => patchNutrition({ potassium: value })}
      magnesium={draft.magnesium}
      onMagnesiumChange={(value) => patchNutrition({ magnesium: value })}
      showSodium={showSodium}
      showPotassium={showPotassium}
      showMagnesium={showMagnesium}
      note={draft.note}
      onNoteChange={onNoteChange}
      amountG={draft.amountG}
      onAmountGChange={onAmountGChange}
      onAmountGBlur={onAmountGBlur}
      macroMode={draft.macroMode}
      onMacroModeChange={onMacroModeChange}
      servings={activeServings}
      servingMode={servingMode}
      onServingModeChange={onServingModeChange}
      servingCount={servingCount}
      onServingCountChange={onServingCountChange}
      mealItems={mealItems}
      onSelectMealItem={onSelectMealItem}
      emotion={draft.emotion}
      onEmotionChange={onEmotionChange}
      favorite={draft.favorite}
      onFavoriteChange={onFavoriteChange}
      todayTotalPreview={todayTotalPreview}
      todayRemainingPreview={todayRemainingPreview}
      infoMessage={
        barcodeNotFoundMessage
          ? t.dailyEntry.noFoodFoundForBarcodeMessage
          : undefined
      }
      barcode={barcode}
      requireName={requireName}
      onSave={onSave}
    />
  )
}
