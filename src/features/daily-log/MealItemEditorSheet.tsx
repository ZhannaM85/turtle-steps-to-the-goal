import { useEffect, useState } from 'react'
import { Check, Clipboard, Star } from 'lucide-react'
import type { FoodServing } from '@/data/foods'
import type { MealEmotion } from '@/domain/dailyEntry'
import type { MealItem } from '@/domain/mealItem'
import { useLocale, useTranslation } from '@/i18n'
import { formatBarcodeDisplay } from '@/shared/lib/formatBarcode'
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
import { MealItemBrandField } from './MealItemBrandField'
import { MealItemEditorSections } from './MealItemEditorSections'
import { MealItemFormSection } from './MealItemFormSection'
import { MealNoteAutocomplete } from './MealNoteAutocomplete'
import { isInconsistentMacros } from './unusualEntryThresholds'

export interface MealItemEditorSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  name: string
  onNameChange: (value: string) => void
  /** Optional brand name (#248), e.g. "Perdue" — right after the dish
   * name. Collapsed until opened (#993); a non-empty brand starts open. */
  brand: string
  onBrandChange: (value: string) => void
  /** #994 — homemade catalog flag. Off by default; not stored on the meal log. */
  homemade?: boolean
  onHomemadeChange?: (homemade: boolean) => void
  amount: string
  onAmountChange: (value: string) => void
  protein: string
  onProteinChange: (value: string) => void
  fat: string
  onFatChange: (value: string) => void
  carbs: string
  onCarbsChange: (value: string) => void
  /** Dietary fiber in grams (#341) — same optional shape as protein/fat/
   * carbs above, no scope beyond this add/edit form (daily total, goal
   * target, and Today's remaining-fiber card all read `CalorieItem.fiberG`
   * directly; this is the one place it gets typed in). */
  fiber: string
  onFiberChange: (value: string) => void
  /** #582 — hide fiber when Settings → What to track turns it off. */
  showFiber?: boolean
  /** #530 — electrolytes in mg; omit or leave empty when tracking is off. */
  sodium?: string
  onSodiumChange?: (value: string) => void
  potassium?: string
  onPotassiumChange?: (value: string) => void
  magnesium?: string
  onMagnesiumChange?: (value: string) => void
  /** Which electrolyte fields to show (#530 Settings). */
  showSodium?: boolean
  showPotassium?: boolean
  showMagnesium?: boolean
  amountG: string
  onAmountGChange: (value: string) => void
  /** #715 — commit Portion-mode density baseline when Weight (g) blurs
   * (after a first-time weight entry that did not rescale). */
  onAmountGBlur?: () => void
  macroMode: 'per100g' | 'perPortion'
  onMacroModeChange: (mode: 'per100g' | 'perPortion') => void
  /** #645 — named serving-size shortcuts (egg, slice, cup, #254) for the
   * source curated/personal food this sheet was opened from, when it has
   * any — a friendlier alternative to typing raw weight. Omitted (or
   * empty) for the manual "create a new dish" flow, which has no source
   * food to draw a servings list from. Selecting one still ends up
   * driving `amountG` (via `onServingModeChange`/`onServingCountChange`,
   * computed by the caller) in whatever unit the active `macroMode`
   * expects, so switching modes afterward keeps working the normal way. */
  servings?: FoodServing[]
  servingMode?: string
  onServingModeChange?: (mode: string) => void
  servingCount?: string
  onServingCountChange?: (value: string) => void
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
  /** Per-dish free-text note (#344), e.g. "extra spicy today" — distinct
   * from the meal group's own shared note. Deliberately not restored from
   * a picked `MealItem` suggestion, same as `emotion`/`favorite` — always
   * starts blank regardless of which name was selected. */
  note: string
  onNoteChange: (value: string) => void
  /** #260: today's prospective running total once this draft is saved,
   * e.g. "Today would be: 1,850 kcal (was 1,550)" — only passed by the
   * add-a-new-meal flow, where nothing about this draft is reflected in
   * today's total yet. Omitted while editing an item within an
   * already-saved meal, where that meal's *old* total is still counted
   * until the outer Save commits the replacement (a different, harder
   * whole-meal delta this doesn't attempt). */
  todayTotalPreview?: string
  /** #399 — sibling to `todayTotalPreview` above, same add-a-new-meal-only
   * scope: "150 kcal remaining (was 500 kcal remaining)", only passed when
   * the active goal has a `dailyCalorieTargetKcal` set. */
  todayRemainingPreview?: string
  /** #256 — a quiet note shown right below the title, e.g. "No food found
   * for this barcode" after a scan comes up empty. Not an error state,
   * just context for why the fields below are blank. */
  infoMessage?: string
  /** #519 — stored or scan-pending barcode, shown as a quiet secondary
   * line when present. Omitted entirely when undefined/empty. */
  barcode?: string
  onSave: () => void
  /** Second footer action (#183) — saves this dish and keeps the sheet
   * open, reset for the next one, instead of closing. Only passed while
   * adding a genuinely new item (the add row, or a freshly-added blank
   * row in an existing meal's edit mode); omitted while editing an
   * already-existing dish, where "add one more" doesn't make sense. */
  onSaveAndAddAnother?: () => void
  /** #475 — when false (edit flows), suppress Radix Dialog's open
   * auto-focus so the pre-filled name isn't focused and select-all'd
   * (one stray keystroke would overwrite it). Defaults to true for add
   * flows, where focusing the empty name field is still helpful. */
  autoFocusName?: boolean
  /** #518 follow-up — when true (barcode not-found → create), Save stays
   * disabled until a dish name is typed. Without a name, `touch` never
   * wrote a MealItem, so Custom foods stayed empty and rescans missed. */
  requireName?: boolean
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
 *
 * **#344**: restructured into card-grouped sections (Name, Brand,
 * Quantity, Nutrition, Reaction, Note) matching a design mockup shared
 * live, instead of one flat stack of fields. The mockup's own icon-grid
 * showed a 5th "Calories" field duplicating the Quantity section's own
 * kcal input — deliberately not replicated here (kept as the single
 * existing kcal field in Quantity, same value the mockup's Quantity
 * section already showed) to avoid two inputs silently needing to agree
 * on one number.
 */
export function MealItemEditorSheet({
  open,
  onOpenChange,
  title,
  name,
  onNameChange,
  brand,
  onBrandChange,
  homemade = false,
  onHomemadeChange = () => {},
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
  showFiber = true,
  sodium = '',
  onSodiumChange,
  potassium = '',
  onPotassiumChange,
  magnesium = '',
  onMagnesiumChange,
  showSodium = false,
  showPotassium = false,
  showMagnesium = false,
  amountG,
  onAmountGChange,
  onAmountGBlur,
  macroMode,
  onMacroModeChange,
  servings,
  servingMode = 'grams',
  onServingModeChange,
  servingCount = '1',
  onServingCountChange,
  mealItems,
  onSelectMealItem,
  emotion,
  onEmotionChange,
  favorite,
  onFavoriteChange,
  note,
  onNoteChange,
  todayTotalPreview,
  todayRemainingPreview,
  infoMessage,
  barcode,
  onSave,
  onSaveAndAddAnother,
  autoFocusName = true,
  requireName = false,
}: MealItemEditorSheetProps) {
  const t = useTranslation()
  const locale = useLocale()
  // #644 — same auto-clearing "Copied" shape as RecipesSettingsScreen's
  // copiedRecipeId (#611/#636); iOS Safari's native selection handles on
  // this row can't be dragged, so this button is the only working way to
  // copy the barcode.
  const [barcodeCopied, setBarcodeCopied] = useState(false)
  // Reset if a different item's sheet opens while a "Copied" confirmation
  // from the previous one is still showing — adjusted during render
  // (React's recommended prop-change-reset pattern) rather than a second
  // effect, so it doesn't trigger a lint error for cascading setState-in-
  // effect renders.
  const [prevBarcode, setPrevBarcode] = useState(barcode)
  if (barcode !== prevBarcode) {
    setPrevBarcode(barcode)
    setBarcodeCopied(false)
  }

  useEffect(() => {
    if (!barcodeCopied) return
    const timer = setTimeout(() => setBarcodeCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [barcodeCopied])

  async function copyBarcode() {
    if (!barcode) return
    // Raw undelimited digits — what's actually stored/looked-up — not the
    // display-grouped string shown in the label.
    await navigator.clipboard.writeText(barcode)
    setBarcodeCopied(true)
  }

  const amountNum = parseNumberInput(amount)
  const hasValidAmount = amountNum !== undefined && amountNum > 0
  const canSave =
    hasValidAmount && (!requireName || name.trim().length > 0)
  const scaledPreview = hasValidAmount
    ? macroMode === 'per100g'
      ? scaleFromPer100g(
          amountNum,
          parseOptionalMacro(protein),
          parseOptionalMacro(fat),
          parseOptionalMacro(carbs),
          amountG,
          parseOptionalMacro(fiber),
          parseOptionalMacro(sodium),
          parseOptionalMacro(potassium),
          parseOptionalMacro(magnesium),
        )
      : totalFromPortion(
          amountNum,
          parseOptionalMacro(protein),
          parseOptionalMacro(fat),
          parseOptionalMacro(carbs),
          amountG,
          parseOptionalMacro(fiber),
          parseOptionalMacro(sodium),
          parseOptionalMacro(potassium),
          parseOptionalMacro(magnesium),
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
        onOpenAutoFocus={
          autoFocusName
            ? undefined
            : (event) => {
                // #475 — editing an existing dish: don't focus (and
                // select-all) the name field on open. Radix FocusScope
                // otherwise focuses the first tabbable and calls
                // `.select()` on text inputs.
                event.preventDefault()
              }
        }
      >
        <DialogTitle className="font-medium">{title}</DialogTitle>
        {infoMessage && (
          <p className="text-sm text-muted-foreground">{infoMessage}</p>
        )}
        {barcode && (
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1">
              <p className="text-sm text-muted-foreground">
                {t.dailyEntry.itemBarcodeLabel(formatBarcodeDisplay(barcode))}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={
                  barcodeCopied
                    ? t.dailyEntry.barcodeCopiedLabel
                    : t.dailyEntry.copyBarcodeLabel
                }
                onClick={() => void copyBarcode()}
              >
                {barcodeCopied ? (
                  <Check aria-hidden="true" />
                ) : (
                  <Clipboard aria-hidden="true" />
                )}
              </Button>
            </div>
            {barcodeCopied && (
              <span
                role="status"
                className="flex items-center gap-1 text-xs text-muted-foreground"
              >
                <Check aria-hidden="true" className="size-3.5" />
                {t.dailyEntry.barcodeCopiedToastMessage}
              </span>
            )}
          </div>
        )}
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto pt-4">
          <MealItemFormSection heading={t.dailyEntry.itemNameLabel}>
            <div className="flex items-center gap-2">
              <MealNoteAutocomplete
                listInputId="item-editor-dish-title"
                ariaLabel={t.dailyEntry.itemNameLabel}
                placeholder={t.dailyEntry.itemNamePlaceholder}
                value={name}
                onChange={onNameChange}
                onSelectItem={onSelectMealItem}
                onSubmit={onSave}
                suggestions={mealItems}
                className="h-12 text-base"
              />
              {/* #279 — favorites a manually-typed dish right at creation
               * time, via useMealItemStore.touch's favorite argument. Same
               * favorite concept #276 added to the food picker's star.
               * #344: moved beside the input itself (mockup), not above
               * it next to the label. */}
              <Button
                type="button"
                variant="ghost"
                size="icon-xl"
                className="shrink-0"
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
          </MealItemFormSection>

          <MealItemBrandField
            open={open}
            brand={brand}
            onBrandChange={onBrandChange}
            onSubmit={onSave}
            mealItems={mealItems}
          />

          <MealItemEditorSections
            homemade={homemade}
            onHomemadeChange={onHomemadeChange}
            amount={amount}
            onAmountChange={onAmountChange}
            protein={protein}
            onProteinChange={onProteinChange}
            fat={fat}
            onFatChange={onFatChange}
            carbs={carbs}
            onCarbsChange={onCarbsChange}
            fiber={fiber}
            onFiberChange={onFiberChange}
            showFiber={showFiber}
            sodium={sodium}
            onSodiumChange={onSodiumChange}
            potassium={potassium}
            onPotassiumChange={onPotassiumChange}
            magnesium={magnesium}
            onMagnesiumChange={onMagnesiumChange}
            showSodium={showSodium}
            showPotassium={showPotassium}
            showMagnesium={showMagnesium}
            amountG={amountG}
            onAmountGChange={onAmountGChange}
            onAmountGBlur={onAmountGBlur}
            macroMode={macroMode}
            onMacroModeChange={onMacroModeChange}
            servings={servings}
            servingMode={servingMode}
            onServingModeChange={onServingModeChange}
            servingCount={servingCount}
            onServingCountChange={onServingCountChange}
            emotion={emotion}
            onEmotionChange={onEmotionChange}
            name={name}
            note={note}
            onNoteChange={onNoteChange}
            onSave={onSave}
            scaledPreview={scaledPreview}
            totalPreview={totalPreview}
            macrosInconsistent={macrosInconsistent}
            todayTotalPreview={todayTotalPreview}
            todayRemainingPreview={todayRemainingPreview}
          />
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
        {/* #481 — DialogContent bottom padding is now
         * `safe-area + 1.25rem`; cancel the full amount so this footer
         * reaches the true viewport edge, then re-apply safe-area here. */}
        <div className="-mx-5 -mb-[calc(env(safe-area-inset-bottom)+1.25rem)] flex flex-col gap-2 border-t border-border bg-card px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <Button
            type="button"
            size="xl"
            className="w-full"
            disabled={!canSave}
            onClick={onSave}
          >
            {t.dailyEntry.saveButton}
          </Button>
          {onSaveAndAddAnother && (
            <Button
              type="button"
              variant="outline"
              size="xl"
              className="w-full"
              disabled={!canSave}
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
