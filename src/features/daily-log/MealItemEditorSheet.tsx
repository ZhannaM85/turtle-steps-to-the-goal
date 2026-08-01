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
  /** Dietary fiber in grams (#341) — same optional shape as protein/fat/
   * carbs above, no scope beyond this add/edit form (daily total, goal
   * target, and Today's remaining-fiber card all read `CalorieItem.fiberG`
   * directly; this is the one place it gets typed in). */
  fiber: string
  onFiberChange: (value: string) => void
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
    <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
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
  note,
  onNoteChange,
  todayTotalPreview,
  todayRemainingPreview,
  infoMessage,
  onSave,
  onSaveAndAddAnother,
  autoFocusName = true,
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
          parseOptionalMacro(fiber),
        )
      : totalFromPortion(
          amountNum,
          parseOptionalMacro(protein),
          parseOptionalMacro(fat),
          parseOptionalMacro(carbs),
          amountG,
          parseOptionalMacro(fiber),
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
        <DialogTitle>{title}</DialogTitle>
        {infoMessage && (
          <p className="text-sm text-muted-foreground">{infoMessage}</p>
        )}
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto pt-4">
          <FormSection heading={t.dailyEntry.itemNameLabel}>
            <div className="flex items-center gap-2">
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
                className="h-10 flex-1 gap-1.5 px-4 text-sm"
              >
                <span aria-hidden="true">⚖️</span>
                {t.dailyEntry.macroModePer100gOption}
              </ToggleGroupItem>
              <ToggleGroupItem
                value="perPortion"
                className="h-10 flex-1 gap-1.5 px-4 text-sm"
              >
                <span aria-hidden="true">🍜</span>
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
              <NumberField
                label={
                  macroMode === 'per100g'
                    ? t.dailyEntry.itemPortionsLabel
                    : t.dailyEntry.itemWeightLabel
                }
                value={amountG}
                onChange={onAmountGChange}
                onEnter={onSave}
              />
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
               * cells) — deliberately out of scope for that issue. */}
              <NumberField
                icon="🌿"
                label={t.dailyEntry.fiberLabel}
                value={fiber}
                onChange={onFiberChange}
                onEnter={onSave}
              />
            </div>
          </FormSection>

          {(totalPreview ||
            (scaledPreview?.fiberG !== undefined && totalPreview) ||
            (totalPreview && todayTotalPreview) ||
            (totalPreview && todayRemainingPreview) ||
            (totalPreview && macrosInconsistent)) && (
            <div className="flex flex-col gap-1 px-1">
              {totalPreview && (
                <p className="text-sm text-muted-foreground">
                  {t.dailyEntry.computedTotalPrefix} {totalPreview}
                </p>
              )}
              {scaledPreview?.fiberG !== undefined && (
                <p className="text-sm text-muted-foreground">
                  {t.dailyEntry.fiberLabel}: {scaledPreview.fiberG}
                  {t.dailyEntry.gramsUnit}
                </p>
              )}
              {totalPreview && todayTotalPreview && (
                <p className="text-sm text-muted-foreground">
                  {todayTotalPreview}
                </p>
              )}
              {totalPreview && todayRemainingPreview && (
                <p className="text-sm text-muted-foreground">
                  {todayRemainingPreview}
                </p>
              )}
              {totalPreview && macrosInconsistent && (
                <p className="text-sm text-muted-foreground">
                  {t.dailyEntry.macroMismatchNote}
                </p>
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
            <textarea
              aria-label={t.dailyEntry.itemNoteLabel}
              placeholder={t.dailyEntry.itemNotePlaceholder}
              value={note}
              maxLength={NOTE_MAX_LENGTH}
              onChange={(e) => onNoteChange(e.target.value)}
              rows={2}
              className="w-full resize-none rounded-lg border border-input bg-transparent px-2.5 py-2 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
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
            disabled={!hasValidAmount}
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
