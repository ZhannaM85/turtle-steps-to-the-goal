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
  type ExistingRecipeInSelection,
} from './mealSelectionRecipe'

export function CreateRecipeFromMealDialog({
  open,
  onOpenChange,
  items,
  recipes,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: readonly CalorieItem[] | null
  recipes: readonly Pick<Recipe, 'id' | 'name'>[]
  onSave: (recipe: Recipe) => void | Promise<void>
}) {
  const t = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={t.recipes.closeRecipeDialogLabel}>
        <DialogTitle>{t.dailyEntry.createRecipeFromMealTitle}</DialogTitle>
        <DialogDescription>
          {t.dailyEntry.createRecipeFromMealDescription}
        </DialogDescription>
        {open && items && items.length > 0 ? (
          <CreateRecipeFields
            items={items}
            recipes={recipes}
            onOpenChange={onOpenChange}
            onSave={onSave}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function CreateRecipeFields({
  items,
  recipes,
  onOpenChange,
  onSave,
}: {
  items: readonly CalorieItem[]
  recipes: readonly Pick<Recipe, 'id' | 'name'>[]
  onOpenChange: (open: boolean) => void
  onSave: (recipe: Recipe) => void | Promise<void>
}) {
  const t = useTranslation()
  const locale = useLocale()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const existingRecipes = existingRecipesInMealSelection(items, recipes)
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
      onOpenChange(false)
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
      <ExistingRecipeWarning
        matches={existingRecipes}
        onCopyName={(recipeName) => {
          setName(recipeName)
          void navigator.clipboard?.writeText(recipeName).catch(() => {})
        }}
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

function ExistingRecipeWarning({
  matches,
  onCopyName,
}: {
  matches: readonly ExistingRecipeInSelection[]
  onCopyName: (recipeName: string) => void
}) {
  const t = useTranslation()
  if (matches.length === 0) return null
  return (
    <div
      role="status"
      className="flex flex-col gap-2 rounded-lg border border-status-warn/40 bg-status-warn/15 p-3 text-sm text-foreground"
    >
      <p>{t.dailyEntry.createRecipeExistingRecipesWarning}</p>
      <ul className="flex flex-col gap-2">
        {matches.map((match) => (
          <li
            key={match.recipeId}
            className="flex items-center justify-between gap-2"
          >
            <span>{match.ingredientName}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              aria-label={t.dailyEntry.createRecipeCopyExistingNameLabel(
                match.recipeName,
              )}
              onClick={() => onCopyName(match.recipeName)}
            >
              {t.dailyEntry.createRecipeCopyExistingNameButton}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}
