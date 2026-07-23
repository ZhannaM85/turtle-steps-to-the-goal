import { useEffect, useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Recipe } from '@/domain/recipe'
import { recipePerServing } from '@/domain/recipe'
import { useLocale, useTranslation } from '@/i18n'
import { formatComputedTotal } from '@/shared/lib/macroScaling'
import { useMealItemStore, useRecipeStore } from '@/stores'
import { Button } from '@/shared/ui/button'
import { PageHeader } from '@/shared/ui/page-header'
import { RecipeEditorDialog } from './RecipeEditorDialog'

/**
 * Manage recipes (#251) — reached from Settings, same "dedicated
 * management screen" shape `FoodListSettingsScreen.tsx` already
 * established for the curated food list. Building/editing a recipe itself
 * happens in `RecipeEditorDialog.tsx`; this screen is just the list +
 * entry points into that dialog.
 */
export function RecipesSettingsScreen() {
  const t = useTranslation()
  const locale = useLocale()
  const recipes = useRecipeStore((state) => state.recipes)
  const loadRecipes = useRecipeStore((state) => state.loadRecipes)
  const upsertRecipe = useRecipeStore((state) => state.upsertRecipe)
  const deleteRecipe = useRecipeStore((state) => state.deleteRecipe)
  const mealItems = useMealItemStore((state) => state.items)
  const loadMealItems = useMealItemStore((state) => state.loadItems)

  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  useEffect(() => {
    loadRecipes()
    loadMealItems()
  }, [loadRecipes, loadMealItems])

  return (
    <div className="flex flex-col gap-4">
      <Link
        to="/settings"
        className="self-start text-sm text-muted-foreground hover:text-foreground"
      >
        {t.settings.backToSettingsLabel}
      </Link>
      <PageHeader
        title={t.recipes.screenTitle}
        description={t.recipes.screenDescription}
      />
      {recipes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t.recipes.emptyStateText}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {recipes.map((recipe) => {
            const perServing = recipePerServing(recipe)
            return (
              <li
                key={recipe.id}
                className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{recipe.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {t.recipes.servingsCountLabel(recipe.servings)} ·{' '}
                    {formatComputedTotal(perServing, locale, t)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t.recipes.editRecipeLabel(recipe.name)}
                    onClick={() => setEditingRecipe(recipe)}
                  >
                    <Pencil aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t.recipes.deleteRecipeLabel(recipe.name)}
                    onClick={() => deleteRecipe(recipe.id)}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => setIsAdding(true)}
      >
        {t.recipes.addRecipeButton}
      </Button>
      {isAdding && (
        <RecipeEditorDialog
          open
          onOpenChange={setIsAdding}
          recipe={null}
          mealItems={mealItems}
          onSave={(recipe) => {
            upsertRecipe(recipe)
            setIsAdding(false)
          }}
        />
      )}
      {editingRecipe && (
        <RecipeEditorDialog
          open
          onOpenChange={(open) => !open && setEditingRecipe(null)}
          recipe={editingRecipe}
          mealItems={mealItems}
          onSave={(recipe) => {
            upsertRecipe(recipe)
            setEditingRecipe(null)
          }}
        />
      )}
    </div>
  )
}
