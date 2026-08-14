import { useEffect, useState } from 'react'
import { Check, Clipboard, Star } from 'lucide-react'
import type { FoodServing } from '@/data/foods'
import type { MealEmotion } from '@/domain/dailyEntry'
import type { MealItem } from '@/domain/mealItem'
import { formatNumber, useLocale, useTranslation } from '@/i18n'
import { MEAL_EMOTIONS } from '@/shared/lib/emotionIcons'
import { formatBarcodeDisplay } from '@/shared/lib/formatBarcode'
import { formatMacroGrams } from '@/shared/lib/macroDisplay'
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
import { Textarea } from '@/shared/ui/textarea'
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

const NOTE_MAX_LENGTH = 200

/** One card-style section (#344 redesign) — a bordered, rounded group
 * around a logical piece of the form (name, quantity, nutrition, etc.),
 * matching the design mockup's layout. Purely a visual grouping wrapper,
 * not a new interaction pattern. */
function FormSection({
  heading,
  headingAction,
  children,
}: {
  heading?: string
  headingAction?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border p-4">
      {heading && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-foreground">
            {heading}
          </span>
          {headingAction}
        </div>
      )}
      {children}
    </div>
  )
}

function NumberField({
  label,
  icon,
  value,
  onChange,
  onBlur,
  onEnter,
}: {
  label: string
  /** Leading emoji (#344 redesign) — e.g. 🌿 for protein, 💧 for fat.
   * Purely decorative (aria-hidden), matching the design mockup's
   * icon-per-nutrition-field treatment. Omitted for fields the mockup
   * doesn't give an icon to (the plain kcal/quantity fields). */
  icon?: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  onEnter: () => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
        {icon && (
          <span aria-hidden="true" className="text-base leading-none">
            {icon}
          </span>
        )}
        {label}
      </span>
      <Input
        type="text"
        inputMode="decimal"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
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
          <FormSection heading={t.dailyEntry.itemNameLabel}>
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
          </FormSection>

          <FormSection heading={t.dailyEntry.itemBrandLabel}>
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
          </FormSection>

          <FormSection heading={t.dailyEntry.itemQuantitySectionLabel}>
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

            {/* #645 — friendlier serving-size shortcuts (#254), same
             * toggle pattern FoodPickerDialog's own servings picker
             * already uses, offered here too now that this sheet is the
             * one confirm screen for every add-a-meal entry point. */}
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
              {/* #111/#121: in per-100g mode this is a portions-*count*
               * multiplier ("× 100g"). #121 originally made it a
               * non-interactive "Portion" badge in Portion mode (an
               * editable "100" there read as a confusing multiplier that
               * didn't actually apply) — #457 restored it as a real,
               * optional field there instead, since without it there was
               * no way to record a portion-mode item's actual weight at
               * all, which is what lets a per-100g rate be
               * back-calculated later (`ratesFromAbsolute`) even for
               * something entered as a direct total. Genuinely a
               * different unit than per-100g mode's own field (real
               * grams, not a portions count) — the mode-switch handlers
               * (`changeManualDraftMode`/`updateEditItemMode`) convert
               * between the two so switching modes doesn't leave a stale
               * number read in the wrong unit. */}
              {servingMode !== 'grams' && onServingCountChange ? (
                <NumberField
                  label={t.dailyEntry.servingCountLabel}
                  value={servingCount}
                  onChange={onServingCountChange}
                  onEnter={onSave}
                />
              ) : (
                <NumberField
                  label={
                    macroMode === 'per100g'
                      ? t.dailyEntry.itemPortionsLabel
                      : t.dailyEntry.itemWeightLabel
                  }
                  value={amountG}
                  onChange={onAmountGChange}
                  onBlur={
                    macroMode === 'perPortion' ? onAmountGBlur : undefined
                  }
                  onEnter={onSave}
                />
              )}
            </div>
          </FormSection>

          <FormSection
            heading={t.dailyEntry.itemNutritionSectionLabel(
              macroMode === 'per100g',
            )}
          >
            <div className="grid grid-cols-2 gap-4">
              <NumberField
                icon="🌿"
                label={t.dailyEntry.proteinLabel}
                value={protein}
                onChange={onProteinChange}
                onEnter={onSave}
              />
              <NumberField
                icon="💧"
                label={t.dailyEntry.fatLabel}
                value={fat}
                onChange={onFatChange}
                onEnter={onSave}
              />
              <NumberField
                icon="🟤"
                label={t.dailyEntry.carbsLabel}
                value={carbs}
                onChange={onCarbsChange}
                onEnter={onSave}
              />
              {/* #341 — its own field rather than folded into the shared
               * macrosSummaryTextCompact-based total preview below, which
               * would ripple fiber into every other place that same
               * compact summary renders (meal-item rows, History's table
               * cells) — deliberately out of scope for that issue.
               * #582 — gated by Settings → What to track → Fiber. */}
              {showFiber && (
                <NumberField
                  icon="🌿"
                  label={t.dailyEntry.fiberLabel}
                  value={fiber}
                  onChange={onFiberChange}
                  onEnter={onSave}
                />
              )}
              {showSodium && onSodiumChange && (
                <NumberField
                  icon="🧂"
                  label={t.dailyEntry.sodiumLabel}
                  value={sodium}
                  onChange={onSodiumChange}
                  onEnter={onSave}
                />
              )}
              {showPotassium && onPotassiumChange && (
                <NumberField
                  icon="🍌"
                  label={t.dailyEntry.potassiumLabel}
                  value={potassium}
                  onChange={onPotassiumChange}
                  onEnter={onSave}
                />
              )}
              {showMagnesium && onMagnesiumChange && (
                <NumberField
                  icon="🥬"
                  label={t.dailyEntry.magnesiumLabel}
                  value={magnesium}
                  onChange={onMagnesiumChange}
                  onEnter={onSave}
                />
              )}
            </div>
          </FormSection>

          {(totalPreview ||
            (scaledPreview?.fiberG !== undefined && totalPreview) ||
            (totalPreview && todayTotalPreview) ||
            (totalPreview && todayRemainingPreview) ||
            (totalPreview && macrosInconsistent)) && (
            // #505 — same base/sm split as Day meal card: dish kcal hero +
            // day totals at text-base; secondary notes stay text-sm.
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

          <FormSection heading={t.dailyEntry.itemEmotionLabel}>
            <EmotionPicker
              value={emotion}
              onChange={onEmotionChange}
              options={MEAL_EMOTIONS}
              labelFor={t.dailyEntry.mealEmotionLabel}
              contextLabel={name || undefined}
              size="icon-xl"
            />
          </FormSection>

          <FormSection heading={t.dailyEntry.itemNoteLabel}>
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
          </FormSection>
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
