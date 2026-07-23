import { useState } from 'react'
import type { Recipe } from '@/domain/recipe'
import { recipeServingsTotal } from '@/domain/recipe'
// Direct file import, not the daily-log barrel — see RecipeEditorDialog.tsx's
// own comment for why (this is a type-only import so it's erased at build
// time anyway, but importing consistently through the barrel-avoiding path
// keeps the reasoning in one place).
import type { PickedFoodValues } from '@/features/daily-log/FoodPickerDialog'
import { useLocale, useTranslation } from '@/i18n'
import { cn } from '@/shared/lib/utils'
import { formatComputedTotal } from '@/shared/lib/macroScaling'
import { parseNumberInput } from '@/shared/lib/parseNumberInput'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'

export interface LogRecipeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  recipes: Recipe[]
  /** Hands back a single-element array, same shape `FoodPickerDialog`'s
   * own `onAdd` already uses (#251) — lets the caller (`MealList.tsx`)
   * feed a logged recipe straight into its existing `addFoodEntry`,
   * rather than needing a second "add one dish" code path. */
  onLog: (values: PickedFoodValues[]) => void
}

/**
 * "Log N servings of [recipe]" (#251) — picks one recipe from the personal
 * list, scales its per-serving totals by however many servings were
 * actually eaten (`recipeServingsTotal`), and hands back one
 * `PickedFoodValues`-shaped result. Undefined macros (no ingredient logged
 * that one) become 0 for logging purposes — a projection is always a real
 * number, same convention `MealList.tsx`'s own "today would be" preview
 * already uses (#278).
 */
export function LogRecipeDialog({
  open,
  onOpenChange,
  recipes,
  onLog,
}: LogRecipeDialogProps) {
  const t = useTranslation()
  const locale = useLocale()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [servingsEaten, setServingsEaten] = useState('1')

  const selectedRecipe = recipes.find((recipe) => recipe.id === selectedId)
  const servingsEatenNum = parseNumberInput(servingsEaten)
  const canLog =
    selectedRecipe !== undefined &&
    servingsEatenNum !== undefined &&
    servingsEatenNum > 0

  const preview =
    selectedRecipe && servingsEatenNum && servingsEatenNum > 0
      ? recipeServingsTotal(selectedRecipe, servingsEatenNum)
      : null

  function handleLog() {
    if (!canLog || !selectedRecipe || servingsEatenNum === undefined) return
    const totals = recipeServingsTotal(selectedRecipe, servingsEatenNum)
    onLog([
      {
        note: selectedRecipe.name,
        amountKcal: totals.amountKcal,
        proteinG: totals.proteinG ?? 0,
        fatG: totals.fatG ?? 0,
        carbsG: totals.carbsG ?? 0,
      },
    ])
    setSelectedId(null)
    setServingsEaten('1')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="fullscreen"
        closeLabel={t.recipes.closeLogRecipeDialogLabel}
        className="flex flex-col"
      >
        <DialogTitle>{t.recipes.logRecipeDialogTitle}</DialogTitle>
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto pt-4">
          {recipes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t.recipes.noRecipesYetMessage}
            </p>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <span className="text-sm text-muted-foreground">
                  {t.recipes.pickRecipeLabel}
                </span>
                <ul className="flex flex-col gap-1.5">
                  {recipes.map((recipe) => (
                    <li key={recipe.id}>
                      <button
                        type="button"
                        aria-pressed={recipe.id === selectedId}
                        onClick={() => setSelectedId(recipe.id)}
                        className={cn(
                          'w-full rounded-lg px-3 py-2 text-left text-sm ring-1 ring-foreground/10',
                          recipe.id === selectedId
                            ? 'border-2 border-primary bg-primary/15'
                            : 'bg-muted/40',
                        )}
                      >
                        {recipe.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              {selectedRecipe && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm text-muted-foreground">
                    {t.recipes.servingsEatenLabel}
                  </span>
                  <Input
                    type="text"
                    inputMode="decimal"
                    aria-label={t.recipes.servingsEatenLabel}
                    value={servingsEaten}
                    onChange={(e) => setServingsEaten(e.target.value)}
                    className="h-12 w-24 text-base"
                  />
                </div>
              )}
              {preview && (
                <p className="text-sm text-muted-foreground">
                  {t.dailyEntry.computedTotalPrefix}{' '}
                  {formatComputedTotal(preview, locale, t)}
                </p>
              )}
            </>
          )}
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            {t.recipes.cancelLabel}
          </Button>
          <Button type="button" size="lg" disabled={!canLog} onClick={handleLog}>
            {t.recipes.logButtonLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
