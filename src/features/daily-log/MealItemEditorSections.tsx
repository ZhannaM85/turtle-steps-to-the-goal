import type { FoodServing } from '@/data/foods'
import type { MealEmotion } from '@/domain/dailyEntry'
import { formatNumber, useLocale, useTranslation } from '@/i18n'
import { MEAL_EMOTIONS } from '@/shared/lib/emotionIcons'
import { formatMacroGrams } from '@/shared/lib/macroDisplay'
import type { scaleFromPer100g, totalFromPortion } from '@/shared/lib/macroScaling'
import { Textarea } from '@/shared/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/toggle-group'
import { EmotionPicker } from './EmotionPicker'
import { MealItemFormSection } from './MealItemFormSection'
import { MealItemHomemadeCheckbox } from './MealItemHomemadeCheckbox'
import { MealItemNumberField } from './MealItemNumberField'

const NOTE_MAX_LENGTH = 200

type ScaledPreview =
  | ReturnType<typeof scaleFromPer100g>
  | ReturnType<typeof totalFromPortion>

/** Quantity, nutrition, reaction, and note for Add/Edit dish (#344).
 * Homemade (#994) sits above quantity, outside the brand disclosure. */
export function MealItemEditorSections({
  homemade,
  onHomemadeChange,
  amount,
  onAmountChange,
  protein,
  onProteinChange,
  fat,
  onFatChange,
  carbs,
  onCarbsChange,
  fiber,
  onFiberChange,
  showFiber,
  sodium,
  onSodiumChange,
  potassium,
  onPotassiumChange,
  magnesium,
  onMagnesiumChange,
  showSodium,
  showPotassium,
  showMagnesium,
  amountG,
  onAmountGChange,
  onAmountGBlur,
  macroMode,
  onMacroModeChange,
  servings,
  servingMode,
  onServingModeChange,
  servingCount,
  onServingCountChange,
  emotion,
  onEmotionChange,
  name,
  note,
  onNoteChange,
  onSave,
  scaledPreview,
  totalPreview,
  macrosInconsistent,
  todayTotalPreview,
  todayRemainingPreview,
}: {
  homemade: boolean
  onHomemadeChange: (homemade: boolean) => void
  amount: string
  onAmountChange: (value: string) => void
  protein: string
  onProteinChange: (value: string) => void
  fat: string
  onFatChange: (value: string) => void
  carbs: string
  onCarbsChange: (value: string) => void
  fiber: string
  onFiberChange: (value: string) => void
  showFiber: boolean
  sodium: string
  onSodiumChange?: (value: string) => void
  potassium: string
  onPotassiumChange?: (value: string) => void
  magnesium: string
  onMagnesiumChange?: (value: string) => void
  showSodium: boolean
  showPotassium: boolean
  showMagnesium: boolean
  amountG: string
  onAmountGChange: (value: string) => void
  onAmountGBlur?: () => void
  macroMode: 'per100g' | 'perPortion'
  onMacroModeChange: (mode: 'per100g' | 'perPortion') => void
  servings?: FoodServing[]
  servingMode: string
  onServingModeChange?: (mode: string) => void
  servingCount: string
  onServingCountChange?: (value: string) => void
  emotion: MealEmotion | undefined
  onEmotionChange: (emotion: MealEmotion | undefined) => void
  name: string
  note: string
  onNoteChange: (value: string) => void
  onSave: () => void
  scaledPreview: ScaledPreview | null
  totalPreview: string | null
  macrosInconsistent: boolean
  todayTotalPreview?: string
  todayRemainingPreview?: string
}) {
  const t = useTranslation()
  const locale = useLocale()

  return (
    <>
      <MealItemHomemadeCheckbox
        homemade={homemade}
        onHomemadeChange={onHomemadeChange}
      />

      <MealItemFormSection heading={t.dailyEntry.itemQuantitySectionLabel}>
        <ToggleGroup
          type="single"
          aria-label={t.dailyEntry.macroModeLabel}
          value={macroMode}
          onValueChange={(value) =>
            value && onMacroModeChange(value as 'per100g' | 'perPortion')
          }
          className="w-full gap-3 p-1"
        >
          <ToggleGroupItem
            value="per100g"
            className="h-10 flex-1 gap-1.5 px-4 text-sm data-[state=on]:bg-background data-[state=on]:font-semibold data-[state=on]:text-foreground data-[state=on]:ring-2 data-[state=on]:ring-primary/45 data-[state=on]:shadow-sm data-[state=off]:opacity-70"
          >
            <span aria-hidden="true">⚖️</span>
            {t.dailyEntry.macroModePer100gOption}
          </ToggleGroupItem>
          <ToggleGroupItem
            value="perPortion"
            className="h-10 flex-1 gap-1.5 px-4 text-sm data-[state=on]:bg-background data-[state=on]:font-semibold data-[state=on]:text-foreground data-[state=on]:ring-2 data-[state=on]:ring-primary/45 data-[state=on]:shadow-sm data-[state=off]:opacity-70"
          >
            <span aria-hidden="true">🍜</span>
            {t.dailyEntry.macroModePerPortionOption}
          </ToggleGroupItem>
        </ToggleGroup>

        {servings && servings.length > 0 && onServingModeChange && (
          <ToggleGroup
            type="single"
            aria-label={t.dailyEntry.servingModeLabel}
            value={servingMode}
            onValueChange={(value) => value && onServingModeChange(value)}
            className="w-fit flex-wrap gap-2 p-1"
          >
            <ToggleGroupItem value="grams" className="h-8 px-3 text-xs">
              {t.dailyEntry.gramsModeOption}
            </ToggleGroupItem>
            {servings.map((serving, index) => (
              <ToggleGroupItem
                key={index}
                value={String(index)}
                className="h-8 px-3 text-xs"
              >
                {serving[locale]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        )}

        <div className="grid grid-cols-2 gap-4">
          <MealItemNumberField
            label={
              macroMode === 'per100g'
                ? t.dailyEntry.addCaloriesLabel
                : t.dailyEntry.addCaloriesPortionLabel
            }
            value={amount}
            onChange={onAmountChange}
            onEnter={onSave}
            maxFractionDigits={2}
          />
          {servingMode !== 'grams' && onServingCountChange ? (
            <MealItemNumberField
              label={t.dailyEntry.servingCountLabel}
              value={servingCount}
              onChange={onServingCountChange}
              onEnter={onSave}
            />
          ) : (
            <MealItemNumberField
              label={
                macroMode === 'per100g'
                  ? t.dailyEntry.itemPortionsLabel
                  : t.dailyEntry.itemWeightLabel
              }
              value={amountG}
              onChange={onAmountGChange}
              onBlur={macroMode === 'perPortion' ? onAmountGBlur : undefined}
              onEnter={onSave}
            />
          )}
        </div>
      </MealItemFormSection>

      <MealItemFormSection
        heading={t.dailyEntry.itemNutritionSectionLabel(macroMode === 'per100g')}
      >
        {/* #990 — three macros on one row. Fiber and electrolytes
         * stay on the following 2-column grid. */}
        <div className="grid grid-cols-3 gap-2">
          <MealItemNumberField
            compact
            icon="🌿"
            label={t.dailyEntry.proteinLabel}
            value={protein}
            onChange={onProteinChange}
            onEnter={onSave}
            maxFractionDigits={2}
          />
          <MealItemNumberField
            compact
            icon="💧"
            label={t.dailyEntry.fatLabel}
            value={fat}
            onChange={onFatChange}
            onEnter={onSave}
            maxFractionDigits={2}
          />
          <MealItemNumberField
            compact
            icon="🟤"
            label={t.dailyEntry.carbsLabel}
            value={carbs}
            onChange={onCarbsChange}
            onEnter={onSave}
            maxFractionDigits={2}
          />
        </div>
        {(showFiber || showSodium || showPotassium || showMagnesium) && (
          <div className="grid grid-cols-2 gap-4">
            {showFiber && (
              <MealItemNumberField
                icon="🌿"
                label={t.dailyEntry.fiberLabel}
                value={fiber}
                onChange={onFiberChange}
                onEnter={onSave}
                maxFractionDigits={2}
              />
            )}
            {showSodium && onSodiumChange && (
              <MealItemNumberField
                icon="🧂"
                label={t.dailyEntry.sodiumLabel}
                value={sodium}
                onChange={onSodiumChange}
                onEnter={onSave}
              />
            )}
            {showPotassium && onPotassiumChange && (
              <MealItemNumberField
                icon="🍌"
                label={t.dailyEntry.potassiumLabel}
                value={potassium}
                onChange={onPotassiumChange}
                onEnter={onSave}
              />
            )}
            {showMagnesium && onMagnesiumChange && (
              <MealItemNumberField
                icon="🥬"
                label={t.dailyEntry.magnesiumLabel}
                value={magnesium}
                onChange={onMagnesiumChange}
                onEnter={onSave}
              />
            )}
          </div>
        )}
      </MealItemFormSection>

      {(totalPreview ||
        (scaledPreview?.fiberG !== undefined && totalPreview) ||
        (totalPreview && todayTotalPreview) ||
        (totalPreview && todayRemainingPreview) ||
        (totalPreview && macrosInconsistent)) && (
        <div className="flex flex-col gap-1.5 px-1 text-sm text-muted-foreground">
          {scaledPreview && (
            <p className="flex items-baseline gap-1.5">
              <span className="text-xl font-semibold tabular-nums">
                {formatNumber(scaledPreview.amountKcal, locale, 0)}{' '}
                {t.dailyEntry.kcalUnit}
              </span>
              {scaledPreview.amountG !== undefined && (
                <span>
                  · {formatMacroGrams(scaledPreview.amountG, locale, t)}
                </span>
              )}
            </p>
          )}
          {totalPreview && (
            <p>
              {t.dailyEntry.computedTotalPrefix} {totalPreview}
            </p>
          )}
          {showFiber && scaledPreview?.fiberG !== undefined && (
            <p>
              {t.dailyEntry.fiberLabel}: {scaledPreview.fiberG}
              {t.dailyEntry.gramsUnit}
            </p>
          )}
          {showSodium && scaledPreview?.sodiumMg !== undefined && (
            <p>
              {t.dailyEntry.sodiumLabel}: {scaledPreview.sodiumMg}
              {t.dailyEntry.mgUnit}
            </p>
          )}
          {showPotassium && scaledPreview?.potassiumMg !== undefined && (
            <p>
              {t.dailyEntry.potassiumLabel}: {scaledPreview.potassiumMg}
              {t.dailyEntry.mgUnit}
            </p>
          )}
          {showMagnesium && scaledPreview?.magnesiumMg !== undefined && (
            <p>
              {t.dailyEntry.magnesiumLabel}: {scaledPreview.magnesiumMg}
              {t.dailyEntry.mgUnit}
            </p>
          )}
          {totalPreview && todayTotalPreview && (
            <p className="text-base">{todayTotalPreview}</p>
          )}
          {totalPreview && todayRemainingPreview && (
            <p className="text-base">{todayRemainingPreview}</p>
          )}
          {totalPreview && macrosInconsistent && (
            <p>{t.dailyEntry.macroMismatchNote}</p>
          )}
        </div>
      )}

      <MealItemFormSection heading={t.dailyEntry.itemEmotionLabel}>
        <EmotionPicker
          value={emotion}
          onChange={onEmotionChange}
          options={MEAL_EMOTIONS}
          labelFor={t.dailyEntry.mealEmotionLabel}
          contextLabel={name || undefined}
          size="icon-xl"
        />
      </MealItemFormSection>

      <MealItemFormSection heading={t.dailyEntry.itemNoteLabel}>
        <Textarea
          aria-label={t.dailyEntry.itemNoteLabel}
          placeholder={t.dailyEntry.itemNotePlaceholder}
          value={note}
          maxLength={NOTE_MAX_LENGTH}
          onChange={(e) => onNoteChange(e.target.value)}
          rows={2}
        />
        <span className="self-end text-xs text-muted-foreground">
          {note.length}/{NOTE_MAX_LENGTH}
        </span>
      </MealItemFormSection>
    </>
  )
}
