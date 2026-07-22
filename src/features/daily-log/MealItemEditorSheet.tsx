import { Star } from 'lucide-react'
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
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/toggle-group'
import { EmotionPicker } from './EmotionPicker'
import { MealNoteAutocomplete } from './MealNoteAutocomplete'
import { isInconsistentMacros } from './unusualEntryThresholds'

export interface MealItemEditorSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  name: string
  onNameChange: (value: string) => void
  /** Optional brand name (#248), e.g. "Perdue" — shown right after the
   * dish name field. */
  brand: string
  onBrandChange: (value: string) => void
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
  /** #279 — marks this dish as a favorite (`useMealItemStore.touch`'s new
   * third argument) the moment it's saved, same favorite concept #276
   * already added to the food picker's own star toggle. Lets a dish typed
   * by hand here be pinned to the top of future searches immediately,
   * instead of only afterward via the food picker or Settings' own list. */
  favorite: boolean
  onFavoriteChange: (favorite: boolean) => void
  /** #260: today's prospective running total once this draft is saved,
   * e.g. "Today would be: 1,850 kcal (was 1,550)" — only passed by the
   * add-a-new-meal flow, where nothing about this draft is reflected in
   * today's total yet. Omitted while editing an item within an
   * already-saved meal, where that meal's *old* total is still counted
   * until the outer Save commits the replacement (a different, harder
   * whole-meal delta this doesn't attempt). */
  todayTotalPreview?: string
  /** #256 — a quiet note shown right below the title, e.g. "No food found
   * for this barcode" after a scan comes up empty. Not an error state,
   * just context for why the fields below are blank. */
  infoMessage?: string
  onSave: () => void
  /** Second footer action (#183) — saves this dish and keeps the sheet
   * open, reset for the next one, instead of closing. Only passed while
   * adding a genuinely new item (the add row, or a freshly-added blank
   * row in an existing meal's edit mode); omitted while editing an
   * already-existing dish, where "add one more" doesn't make sense. */
  onSaveAndAddAnother?: () => void
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
  brand,
  onBrandChange,
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
  favorite,
  onFavoriteChange,
  todayTotalPreview,
  infoMessage,
  onSave,
  onSaveAndAddAnother,
}: MealItemEditorSheetProps) {
  const t = useTranslation()
  const locale = useLocale()

  const amountNum = parseNumberInput(amount)
  const hasValidAmount = amountNum !== undefined && amountNum > 0
  const scaledPreview = hasValidAmount
    ? macroMode === 'per100g'
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
        )
    : null
  const totalPreview = scaledPreview
    ? formatComputedTotal(scaledPreview, locale, t)
    : null
  // #255 — gentle, non-blocking sanity check: the entered kcal vs. the
  // 4/9/4 estimate from its own macros, one level down from #218's
  // day-total plausibility check. Deliberately muted, not `text-destructive`
  // like #218's warnings — informational only, never blocks saving.
  const macrosInconsistent = scaledPreview
    ? isInconsistentMacros(
        scaledPreview.amountKcal,
        scaledPreview.proteinG,
        scaledPreview.fatG,
        scaledPreview.carbsG,
      )
    : false

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="fullscreen"
        closeLabel={t.dailyEntry.closeItemEditorLabel}
        className="flex flex-col"
      >
        <DialogTitle>{title}</DialogTitle>
        {infoMessage && (
          <p className="text-sm text-muted-foreground">{infoMessage}</p>
        )}
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto pt-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">
                {t.dailyEntry.itemNameLabel}
              </span>
              {/* #279 — favorites a manually-typed dish right at creation
               * time, via useMealItemStore.touch's favorite argument. Same
               * favorite concept #276 added to the food picker's star. */}
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={
                  favorite
                    ? t.dailyEntry.unfavoriteFoodLabel(name || t.dailyEntry.itemNameLabel)
                    : t.dailyEntry.favoriteFoodLabel(name || t.dailyEntry.itemNameLabel)
                }
                aria-pressed={favorite}
                onClick={() => onFavoriteChange(!favorite)}
              >
                <Star aria-hidden="true" className={cn(favorite && 'fill-current')} />
              </Button>
            </div>
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

          <div className="flex flex-col gap-1.5">
            <span className="text-sm text-muted-foreground">
              {t.dailyEntry.itemBrandLabel}
            </span>
            <Input
              type="text"
              aria-label={t.dailyEntry.itemBrandLabel}
              placeholder={t.dailyEntry.itemBrandPlaceholder}
              value={brand}
              onChange={(e) => onBrandChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  onSave()
                }
              }}
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
          {totalPreview && todayTotalPreview && (
            <p className="text-sm text-muted-foreground">
              {todayTotalPreview}
            </p>
          )}
          {totalPreview && macrosInconsistent && (
            <p className="text-sm text-muted-foreground">
              {t.dailyEntry.macroMismatchNote}
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

        {/* Footer with the primary action, below the scrollable fields
         * above (#91). Was `position: sticky` until #280 — confirmed live
         * (Playwright measurements) that it overlapped the last ~20px of
         * the scroll region's own content instead of sitting flush below
         * it, clipping the Reaction row right above it. Same root cause
         * #275 already found and fixed the same way for FoodPickerDialog:
         * `position: sticky` doesn't behave inside this DialogContent's
         * `fixed` + `overflow-y-auto` wrapper — removing it here too,
         * relying on the scroll region's own bounded height instead. */}
        <div className="-mx-5 -mb-5 flex flex-col gap-2 border-t border-border bg-card px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <Button
            type="button"
            size="lg"
            className="h-12 w-full text-base"
            disabled={!hasValidAmount}
            onClick={onSave}
          >
            {t.dailyEntry.saveButton}
          </Button>
          {onSaveAndAddAnother && (
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-12 w-full text-base"
              disabled={!hasValidAmount}
              onClick={onSaveAndAddAnother}
            >
              {t.dailyEntry.saveAndAddAnotherButton}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
