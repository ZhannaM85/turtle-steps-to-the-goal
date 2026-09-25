import { useState } from 'react'
import type { CalorieItem } from '@/domain/dailyEntry'
import type { Recipe } from '@/domain/recipe'
import { useLocale, useTranslation } from '@/i18n'
import { formatKcal, formatMacroGrams, macrosSummaryTextCompact } from '@/shared/lib/macroDisplay'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import {
  existingRecipesInMealSelection,
  mealSelectionTotals,
  recipeFromMealSelection,
  recipesMatchingTypedTitle,
  recipesWithSameIngredients,
  type SavedRecipeLookup,
} from './mealSelectionRecipe'

export function CreateRecipeFromMealDialog({
  open,
  onOpenChange,
  items,
  recipes,
  onSave,
  onAddToMeal,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: readonly CalorieItem[] | null
  recipes: readonly SavedRecipeLookup[]
  onSave: (recipe: Recipe) => void | Promise<void>
  /** #987 — called only when she confirms adding the saved recipe. */
  onAddToMeal?: (recipe: Recipe, sourceItems: readonly CalorieItem[]) => void
}) {
  const t = useTranslation()
  const [saved, setSaved] = useState<Recipe | null>(null)

  function handleOpenChange(next: boolean) {
    if (!next) setSaved(null)
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent closeLabel={t.recipes.closeRecipeDialogLabel}>
        {saved && items ? (
          <AddSavedRecipePrompt
            recipeName={saved.name}
            onAdd={() => {
              onAddToMeal?.(saved, items)
              handleOpenChange(false)
            }}
            onSkip={() => handleOpenChange(false)}
          />
        ) : (
          <>
            <DialogTitle>{t.dailyEntry.createRecipeFromMealTitle}</DialogTitle>
            <DialogDescription>
              {t.dailyEntry.createRecipeFromMealDescription}
            </DialogDescription>
            {open && items && items.length > 0 ? (
              <CreateRecipeFields
                items={items}
                recipes={recipes}
                onOpenChange={handleOpenChange}
                onSave={onSave}
                onSaved={onAddToMeal ? setSaved : undefined}
              />
            ) : null}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function CreateRecipeFields({
  items,
  recipes,
  onOpenChange,
  onSave,
  onSaved,
}: {
  items: readonly CalorieItem[]
  recipes: readonly SavedRecipeLookup[]
  onOpenChange: (open: boolean) => void
  onSave: (recipe: Recipe) => void | Promise<void>
  onSaved?: (recipe: Recipe) => void
}) {
  const t = useTranslation()
  const locale = useLocale()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const existingRecipes = existingRecipesInMealSelection(items, recipes)
  const sameIngredients = recipesWithSameIngredients(items, recipes)
  const titleTaken = recipesMatchingTypedTitle(name, recipes)
  function copyRecipeName(recipeName: string) {
    setName(recipeName)
    void navigator.clipboard?.writeText(recipeName).catch(() => {})
  }
  const totals = mealSelectionTotals(items)
  const macros = macrosSummaryTextCompact(
    totals.proteinG,
    totals.fatG,
    totals.carbsG,
    locale,
    t,
  )
  const per100 = totals.per100g
    ? macrosSummaryTextCompact(
        totals.per100g.protein100,
        totals.per100g.fat100,
        totals.per100g.carbs100,
        locale,
        t,
      )
    : null

  async function handleSave() {
    const recipe = recipeFromMealSelection(name, items)
    if (!recipe || busy) return
    setBusy(true)
    try {
      await onSave(recipe)
      if (onSaved) onSaved(recipe)
      else onOpenChange(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 pt-2">
      <ul className="text-sm text-foreground">
        {items.map((item) => (
          <li key={item.id}>{item.name?.trim() || t.dailyEntry.itemNamePlaceholder}</li>
        ))}
      </ul>
      <p className="text-sm text-muted-foreground">
        {formatKcal(totals.amountKcal, locale, t)}
        {totals.amountG !== undefined
          ? ` · ${formatMacroGrams(totals.amountG, locale, t)}`
          : ''}
        {macros ? ` · ${macros}` : ''}
      </p>
      {totals.per100g ? (
        <p className="text-sm text-muted-foreground">
          {t.dailyEntry.createRecipeFromMealPer100gLabel}:{' '}
          {formatKcal(totals.per100g.kcal100, locale, t)}
          {per100 ? ` · ${per100}` : ''}
        </p>
      ) : null}
      <p className="text-sm text-muted-foreground">
        {t.recipes.servingsCountLabel(1)}
      </p>
      <RecipeMatchWarning
        message={t.dailyEntry.createRecipeExistingRecipesWarning}
        rows={existingRecipes.map((match) => ({
          key: match.recipeId,
          label: match.ingredientName,
          copyName: match.recipeName,
        }))}
        onCopyName={copyRecipeName}
      />
      <RecipeMatchWarning
        message={t.dailyEntry.createRecipeSameIngredientsWarning}
        rows={sameIngredients.map((match) => ({
          key: match.recipeId,
          label: match.recipeName,
          copyName: match.recipeName,
        }))}
        onCopyName={copyRecipeName}
      />
      <div className="flex flex-col gap-1">
        <Label htmlFor="create-recipe-from-meal-name">
          {t.recipes.recipeNameLabel}
        </Label>
        <Input
          id="create-recipe-from-meal-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t.recipes.recipeNamePlaceholder}
        />
      </div>
      <RecipeMatchWarning
        message={t.dailyEntry.createRecipeTitleTakenWarning}
        rows={titleTaken.map((match) => ({
          key: match.recipeId,
          label: match.recipeName,
          copyName: match.recipeName,
        }))}
        onCopyName={copyRecipeName}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={busy || !name.trim()}
          onClick={() => void handleSave()}
        >
          {t.dailyEntry.createRecipeFromMealSaveButton}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => onOpenChange(false)}
        >
          {t.recipes.cancelLabel}
        </Button>
      </div>
    </div>
  )
}

function AddSavedRecipePrompt({
  recipeName,
  onAdd,
  onSkip,
}: {
  recipeName: string
  onAdd: () => void
  onSkip: () => void
}) {
  const t = useTranslation()
  return (
    <>
      <DialogTitle>{t.dailyEntry.createRecipeAddToMealTitle}</DialogTitle>
      <DialogDescription>
        {t.dailyEntry.createRecipeAddToMealPrompt(recipeName)}
      </DialogDescription>
      <div className="flex flex-wrap gap-2 pt-2">
        <Button type="button" onClick={onAdd}>
          {t.dailyEntry.createRecipeAddToMealYes}
        </Button>
        <Button type="button" variant="outline" onClick={onSkip}>
          {t.dailyEntry.createRecipeAddToMealNo}
        </Button>
      </div>
    </>
  )
}

function RecipeMatchWarning({
  message,
  rows,
  onCopyName,
}: {
  message: string
  rows: readonly { key: string; label: string; copyName: string }[]
  onCopyName: (recipeName: string) => void
}) {
  const t = useTranslation()
  if (rows.length === 0) return null
  return (
    <div
      role="status"
      className="flex flex-col gap-2 rounded-lg border border-status-warn/40 bg-status-warn/15 p-3 text-sm text-foreground"
    >
      <p>{message}</p>
      <ul className="flex flex-col gap-2">
        {rows.map((row) => (
          <li key={row.key} className="flex items-center justify-between gap-2">
            <span>{row.label}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              aria-label={t.dailyEntry.createRecipeCopyExistingNameLabel(
                row.copyName,
              )}
              onClick={() => onCopyName(row.copyName)}
            >
              {t.dailyEntry.createRecipeCopyExistingNameButton}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}
