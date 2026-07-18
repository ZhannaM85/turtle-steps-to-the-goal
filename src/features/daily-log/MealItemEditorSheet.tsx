import type { MealEmotion } from '@/domain/dailyEntry'
import type { MealItem } from '@/domain/mealItem'
import { useLocale, useTranslation } from '@/i18n'
import { MEAL_EMOTIONS } from '@/shared/lib/emotionIcons'
import {
  formatComputedTotal,
  parseOptionalMacro,
  scaleFromPer100g,
  totalFromPortion,
} from '@/shared/lib/macroScaling'
import { parseNumberInput } from '@/shared/lib/parseNumberInput'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/toggle-group'
import { EmotionPicker } from './EmotionPicker'
import { MealNoteAutocomplete } from './MealNoteAutocomplete'

export interface MealItemEditorSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  name: string
  onNameChange: (value: string) => void
  amount: string
  onAmountChange: (value: string) => void
  protein: string
  onProteinChange: (value: string) => void
  fat: string
  onFatChange: (value: string) => void
  carbs: string
  onCarbsChange: (value: string) => void
  amountG: string
  onAmountGChange: (value: string) => void
  macroMode: 'per100g' | 'perPortion'
  onMacroModeChange: (mode: 'per100g' | 'perPortion') => void
  mealItems: MealItem[]
  onSelectMealItem: (item: MealItem) => void
  /** This dish's own reaction (#129) — moved here from the meal group, so
   * different dishes in the same meal can carry different reactions. */
  emotion: MealEmotion | undefined
  onEmotionChange: (emotion: MealEmotion | undefined) => void
  onSave: () => void
}

function NumberField({
  label,
  value,
  onChange,
  onEnter,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  onEnter: () => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <Input
        type="text"
        inputMode="decimal"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            onEnter()
          }
        }}
        className="h-12 text-base"
      />
    </div>
  )
}

/**
 * Full-screen editor for one meal item's name/kcal/macros (#122) — replaces
 * the previous cramped `flex flex-wrap` row of `h-7 w-16` inputs, used both
 * for adding a brand-new meal's first item and for adding/editing an item
 * within an already-existing meal. Purely a controlled presentational
 * layer: every field is driven by props, and `onSave` is left to the
 * caller (either `addMeal()` for a new meal, or just closing the sheet for
 * an item still staged in `editItems` until the meal's own Save commits
 * it) — this component doesn't know or care which flow it's serving.
 */
export function MealItemEditorSheet({
  open,
  onOpenChange,
  title,
  name,
  onNameChange,
  amount,
  onAmountChange,
  protein,
  onProteinChange,
  fat,
  onFatChange,
  carbs,
  onCarbsChange,
  amountG,
  onAmountGChange,
  macroMode,
  onMacroModeChange,
  mealItems,
  onSelectMealItem,
  emotion,
  onEmotionChange,
  onSave,
}: MealItemEditorSheetProps) {
  const t = useTranslation()
  const locale = useLocale()

  const amountNum = parseNumberInput(amount)
  const hasValidAmount = amountNum !== undefined && amountNum > 0
  const totalPreview = hasValidAmount
    ? formatComputedTotal(
        macroMode === 'per100g'
          ? scaleFromPer100g(
              amountNum,
              parseOptionalMacro(protein),
              parseOptionalMacro(fat),
              parseOptionalMacro(carbs),
              amountG,
            )
          : totalFromPortion(
              amountNum,
              parseOptionalMacro(protein),
              parseOptionalMacro(fat),
              parseOptionalMacro(carbs),
              amountG,
            ),
        locale,
        t,
      )
    : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="fullscreen"
        closeLabel={t.dailyEntry.closeItemEditorLabel}
        className="flex flex-col"
      >
        <DialogTitle>{title}</DialogTitle>
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto pt-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm text-muted-foreground">
              {t.dailyEntry.itemNameLabel}
            </span>
            <MealNoteAutocomplete
              listInputId="item-editor-name"
              ariaLabel={t.dailyEntry.itemNameLabel}
              placeholder={t.dailyEntry.itemNamePlaceholder}
              value={name}
              onChange={onNameChange}
              onSelectItem={onSelectMealItem}
              onSubmit={onSave}
              suggestions={mealItems}
              className="h-12 text-base"
            />
          </div>

          <ToggleGroup
            type="single"
            aria-label={t.dailyEntry.macroModeLabel}
            value={macroMode}
            onValueChange={(value) =>
              value && onMacroModeChange(value as 'per100g' | 'perPortion')
            }
            className="w-fit gap-3 p-1"
          >
            <ToggleGroupItem value="per100g" className="h-10 px-4 text-sm">
              {t.dailyEntry.macroModePer100gOption}
            </ToggleGroupItem>
            <ToggleGroupItem value="perPortion" className="h-10 px-4 text-sm">
              {t.dailyEntry.macroModePerPortionOption}
            </ToggleGroupItem>
          </ToggleGroup>

          <div className="grid grid-cols-2 gap-4">
            <NumberField
              label={
                macroMode === 'per100g'
                  ? t.dailyEntry.addCaloriesLabel
                  : t.dailyEntry.addCaloriesPortionLabel
              }
              value={amount}
              onChange={onAmountChange}
              onEnter={onSave}
            />
            {/* Grams is a pure memory aid in Portion mode (#111/#121), not a
             * multiplier — an editable "100" next to a portion total read as
             * confusing clutter, replaced with a plain "Portion" badge. */}
            {macroMode === 'per100g' ? (
              <NumberField
                label={t.dailyEntry.itemPortionsLabel}
                value={amountG}
                onChange={onAmountGChange}
                onEnter={onSave}
              />
            ) : (
              <div className="flex flex-col gap-1.5">
                <span className="text-sm text-muted-foreground">&nbsp;</span>
                <span className="flex h-12 items-center text-base text-muted-foreground">
                  {t.dailyEntry.macroModePerPortionOption}
                </span>
              </div>
            )}
            <NumberField
              label={t.dailyEntry.proteinLabel}
              value={protein}
              onChange={onProteinChange}
              onEnter={onSave}
            />
            <NumberField
              label={t.dailyEntry.fatLabel}
              value={fat}
              onChange={onFatChange}
              onEnter={onSave}
            />
          </div>
          <NumberField
            label={t.dailyEntry.carbsLabel}
            value={carbs}
            onChange={onCarbsChange}
            onEnter={onSave}
          />

          {totalPreview && (
            <p className="text-sm text-muted-foreground">
              {t.dailyEntry.computedTotalPrefix} {totalPreview}
            </p>
          )}

          <div className="flex flex-col gap-1.5">
            <span className="text-sm text-muted-foreground">
              {t.dailyEntry.itemEmotionLabel}
            </span>
            <EmotionPicker
              value={emotion}
              onChange={onEmotionChange}
              options={MEAL_EMOTIONS}
              labelFor={t.dailyEntry.mealEmotionLabel}
              contextLabel={name || undefined}
              size="icon-xl"
            />
          </div>
        </div>

        {/* Sticky footer (mirrors FoodPickerDialog's #91 pattern) — the
         * primary action stays reachable while the fields above scroll,
         * rather than requiring a scroll-to-bottom to confirm. */}
        <div className="sticky bottom-0 -mx-5 -mb-5 border-t border-border bg-card px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <Button
            type="button"
            size="lg"
            className="h-12 w-full text-base"
            disabled={!hasValidAmount}
            onClick={onSave}
          >
            {t.dailyEntry.saveButton}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
