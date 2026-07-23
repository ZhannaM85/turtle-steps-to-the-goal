import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import type { MealItem } from '@/domain/mealItem'
import type { Recipe, RecipeIngredient } from '@/domain/recipe'
import { recipePerServing } from '@/domain/recipe'
import { useLocale, useTranslation } from '@/i18n'
import {
  formatComputedTotal,
  parseOptionalMacro,
  ratesFromAbsolute,
  scaleFromPer100g,
  totalFromPortion,
} from '@/shared/lib/macroScaling'
import { parseNumberInput } from '@/shared/lib/parseNumberInput'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/toggle-group'
// Imported from its own file, not the daily-log barrel (@/features/daily-log)
// — that barrel also re-exports MealList.tsx, which itself imports this
// feature's LogRecipeDialog, so going through the barrel here would form
// an import cycle (daily-log -> recipes -> daily-log). Same reasoning
// lazyRoutes.ts already documents for MealEditScreen's own direct import.
import { MealNoteAutocomplete } from '@/features/daily-log/MealNoteAutocomplete'

export interface RecipeEditorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null when creating a brand-new recipe; an existing Recipe when
   * editing one — same "null means create" shape `MealItemEditorSheet`'s
   * callers already use for a blank vs. existing draft. */
  recipe: Recipe | null
  mealItems: MealItem[]
  onSave: (recipe: Recipe) => void
}

/**
 * Build/edit a recipe (#251) — a named list of ingredients plus a total
 * yield. Each ingredient is entered the same per-100g-rate + quantity way
 * every other manual-entry surface in this app already uses
 * (`scaleFromPer100g`/`totalFromPortion`), with `MealNoteAutocomplete`
 * offering the same personal-dictionary suggestions the daily log's own
 * "+ Add item" already does — picking one restores its last-logged rate
 * via `ratesFromAbsolute`, same "restore a suggestion" precedent
 * `MealList.tsx`'s `selectEditItemMealItem` established. Ingredients are
 * staged locally (same "nothing persists until Save" shape meal editing
 * already uses) — nothing is written until the whole recipe is saved.
 */
export function RecipeEditorDialog({
  open,
  onOpenChange,
  recipe,
  mealItems,
  onSave,
}: RecipeEditorDialogProps) {
  const t = useTranslation()
  const locale = useLocale()
  const [name, setName] = useState(recipe?.name ?? '')
  const [servings, setServings] = useState(
    recipe ? String(recipe.servings) : '1',
  )
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(
    recipe?.ingredients ?? [],
  )

  const [draftName, setDraftName] = useState('')
  const [draftKcal100, setDraftKcal100] = useState('')
  const [draftProtein100, setDraftProtein100] = useState('')
  const [draftFat100, setDraftFat100] = useState('')
  const [draftCarbs100, setDraftCarbs100] = useState('')
  const [draftAmountG, setDraftAmountG] = useState('1')
  const [draftMacroMode, setDraftMacroMode] = useState<
    'per100g' | 'perPortion'
  >('per100g')

  function resetDraft() {
    setDraftName('')
    setDraftKcal100('')
    setDraftProtein100('')
    setDraftFat100('')
    setDraftCarbs100('')
    setDraftAmountG('1')
    setDraftMacroMode('per100g')
  }

  function selectDraftMealItem(item: MealItem) {
    if (item.lastAmountKcal === undefined) return
    const rates = ratesFromAbsolute(
      item.lastAmountKcal,
      item.lastProteinG,
      item.lastFatG,
      item.lastCarbsG,
      item.lastAmountG,
    )
    setDraftKcal100(String(rates.kcal100))
    setDraftProtein100(
      rates.protein100 === undefined ? '' : String(rates.protein100),
    )
    setDraftFat100(rates.fat100 === undefined ? '' : String(rates.fat100))
    setDraftCarbs100(rates.carbs100 === undefined ? '' : String(rates.carbs100))
    setDraftAmountG(String(rates.portions))
    setDraftMacroMode('per100g')
  }

  const draftKcal100Num = parseNumberInput(draftKcal100)
  const canAddIngredient =
    draftName.trim() !== '' &&
    draftKcal100Num !== undefined &&
    draftKcal100Num >= 0

  function addIngredient() {
    if (!canAddIngredient || draftKcal100Num === undefined) return
    const scaled =
      draftMacroMode === 'per100g'
        ? scaleFromPer100g(
            draftKcal100Num,
            parseOptionalMacro(draftProtein100),
            parseOptionalMacro(draftFat100),
            parseOptionalMacro(draftCarbs100),
            draftAmountG,
          )
        : totalFromPortion(
            draftKcal100Num,
            parseOptionalMacro(draftProtein100),
            parseOptionalMacro(draftFat100),
            parseOptionalMacro(draftCarbs100),
            draftAmountG,
          )
    setIngredients((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: draftName.trim(),
        amountKcal: scaled.amountKcal,
        proteinG: scaled.proteinG,
        fatG: scaled.fatG,
        carbsG: scaled.carbsG,
        amountG: scaled.amountG,
      },
    ])
    resetDraft()
  }

  function removeIngredient(id: string) {
    setIngredients((prev) => prev.filter((ingredient) => ingredient.id !== id))
  }

  const draftNutritionPreview =
    draftKcal100Num && draftKcal100Num >= 0
      ? formatComputedTotal(
          draftMacroMode === 'per100g'
            ? scaleFromPer100g(
                draftKcal100Num,
                parseOptionalMacro(draftProtein100),
                parseOptionalMacro(draftFat100),
                parseOptionalMacro(draftCarbs100),
                draftAmountG,
              )
            : totalFromPortion(
                draftKcal100Num,
                parseOptionalMacro(draftProtein100),
                parseOptionalMacro(draftFat100),
                parseOptionalMacro(draftCarbs100),
                draftAmountG,
              ),
          locale,
          t,
        )
      : null

  const servingsNum = parseNumberInput(servings)
  const canSave =
    name.trim() !== '' &&
    ingredients.length > 0 &&
    servingsNum !== undefined &&
    servingsNum > 0

  const perServingPreview =
    ingredients.length > 0 && servingsNum && servingsNum > 0
      ? recipePerServing({ ingredients, servings: servingsNum })
      : null

  function handleSave() {
    if (!canSave || servingsNum === undefined) return
    const now = new Date().toISOString()
    onSave({
      id: recipe?.id ?? crypto.randomUUID(),
      name: name.trim(),
      ingredients,
      servings: servingsNum,
      createdAt: recipe?.createdAt ?? now,
      updatedAt: now,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="fullscreen"
        closeLabel={t.recipes.closeRecipeDialogLabel}
        className="flex flex-col"
      >
        <DialogTitle>
          {recipe ? t.recipes.editRecipeDialogTitle : t.recipes.addRecipeDialogTitle}
        </DialogTitle>
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto pt-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm text-muted-foreground">
              {t.recipes.recipeNameLabel}
            </span>
            <Input
              type="text"
              aria-label={t.recipes.recipeNameLabel}
              placeholder={t.recipes.recipeNamePlaceholder}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 text-base"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm text-muted-foreground">
              {t.recipes.servingsFieldLabel}
            </span>
            <Input
              type="text"
              inputMode="decimal"
              aria-label={t.recipes.servingsFieldLabel}
              value={servings}
              onChange={(e) => setServings(e.target.value)}
              className="h-12 w-24 text-base"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">
              {t.recipes.ingredientsSectionLabel}
            </span>
            {ingredients.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t.recipes.noIngredientsYetText}
              </p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {ingredients.map((ingredient) => (
                  <li
                    key={ingredient.id}
                    className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-2.5 py-1.5"
                  >
                    <span className="text-sm">
                      {ingredient.name} —{' '}
                      {formatComputedTotal(
                        {
                          amountKcal: ingredient.amountKcal,
                          proteinG: ingredient.proteinG,
                          fatG: ingredient.fatG,
                          carbsG: ingredient.carbsG,
                        },
                        locale,
                        t,
                      )}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t.recipes.removeIngredientLabel(ingredient.name)}
                      onClick={() => removeIngredient(ingredient.id)}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-col gap-1.5 rounded-lg bg-muted/40 px-2.5 py-1.5">
            <MealNoteAutocomplete
              listInputId="recipe-ingredient-name"
              ariaLabel={t.recipes.ingredientNameLabel}
              placeholder={t.recipes.ingredientNamePlaceholder}
              value={draftName}
              onChange={setDraftName}
              onSelectItem={selectDraftMealItem}
              onSubmit={addIngredient}
              suggestions={mealItems}
              className="h-10"
            />
            <ToggleGroup
              type="single"
              aria-label={t.dailyEntry.macroModeLabel}
              value={draftMacroMode}
              onValueChange={(value) =>
                value && setDraftMacroMode(value as 'per100g' | 'perPortion')
              }
              className="w-fit gap-2 p-0.5"
            >
              <ToggleGroupItem value="per100g" className="h-7 px-3 text-xs">
                {t.dailyEntry.macroModePer100gOption}
              </ToggleGroupItem>
              <ToggleGroupItem value="perPortion" className="h-7 px-3 text-xs">
                {t.dailyEntry.macroModePerPortionOption}
              </ToggleGroupItem>
            </ToggleGroup>
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">
                  {draftMacroMode === 'per100g'
                    ? t.dailyEntry.addCaloriesLabel
                    : t.dailyEntry.addCaloriesPortionLabel}
                </span>
                <Input
                  type="text"
                  inputMode="decimal"
                  aria-label={t.dailyEntry.addCaloriesLabel}
                  value={draftKcal100}
                  onChange={(e) => setDraftKcal100(e.target.value)}
                  className="h-7 w-16"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">
                  {t.dailyEntry.proteinLabel}
                </span>
                <Input
                  type="text"
                  inputMode="decimal"
                  aria-label={t.dailyEntry.proteinLabel}
                  value={draftProtein100}
                  onChange={(e) => setDraftProtein100(e.target.value)}
                  className="h-7 w-14"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">
                  {t.dailyEntry.fatLabel}
                </span>
                <Input
                  type="text"
                  inputMode="decimal"
                  aria-label={t.dailyEntry.fatLabel}
                  value={draftFat100}
                  onChange={(e) => setDraftFat100(e.target.value)}
                  className="h-7 w-14"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">
                  {t.dailyEntry.carbsLabel}
                </span>
                <Input
                  type="text"
                  inputMode="decimal"
                  aria-label={t.dailyEntry.carbsLabel}
                  value={draftCarbs100}
                  onChange={(e) => setDraftCarbs100(e.target.value)}
                  className="h-7 w-14"
                />
              </div>
              {draftMacroMode === 'per100g' ? (
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">
                    {t.dailyEntry.itemPortionsLabel}
                  </span>
                  <Input
                    type="text"
                    inputMode="decimal"
                    aria-label={t.dailyEntry.itemPortionsLabel}
                    value={draftAmountG}
                    onChange={(e) => setDraftAmountG(e.target.value)}
                    className="h-7 w-14"
                  />
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">&nbsp;</span>
                  <span className="flex h-7 items-center text-xs text-muted-foreground">
                    {t.dailyEntry.macroModePerPortionOption}
                  </span>
                </div>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canAddIngredient}
                onClick={addIngredient}
              >
                {t.recipes.addIngredientButton}
              </Button>
            </div>
            {draftNutritionPreview && (
              <p className="text-xs text-muted-foreground">
                {t.dailyEntry.computedTotalPrefix} {draftNutritionPreview}
              </p>
            )}
          </div>

          {perServingPreview && (
            <p className="text-sm text-muted-foreground">
              {t.recipes.perServingPreviewPrefix}{' '}
              {formatComputedTotal(
                {
                  amountKcal: perServingPreview.amountKcal,
                  proteinG: perServingPreview.proteinG,
                  fatG: perServingPreview.fatG,
                  carbsG: perServingPreview.carbsG,
                },
                locale,
                t,
              )}
            </p>
          )}
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            {t.recipes.cancelLabel}
          </Button>
          <Button type="button" size="lg" disabled={!canSave} onClick={handleSave}>
            {t.dailyEntry.saveButton}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
