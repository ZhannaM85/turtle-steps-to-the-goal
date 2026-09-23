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
import { mealSelectionTotals, recipeFromMealSelection } from './mealSelectionRecipe'

export function CreateRecipeFromMealDialog({
  open,
  onOpenChange,
  items,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: readonly CalorieItem[] | null
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
  onOpenChange,
  onSave,
}: {
  items: readonly CalorieItem[]
  onOpenChange: (open: boolean) => void
  onSave: (recipe: Recipe) => void | Promise<void>
}) {
  const t = useTranslation()
  const locale = useLocale()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
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
