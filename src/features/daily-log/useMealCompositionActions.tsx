import { useState, type ReactNode } from 'react'
import type { CalorieItem } from '@/domain/dailyEntry'
import type { MealItem } from '@/domain/mealItem'
import type { Recipe } from '@/domain/recipe'
import {
  calorieItemsToShareMealItems,
  ShareFoodDialog,
} from '@/features/food-share'
import { useRecipeStore } from '@/stores'
import { CreateRecipeFromMealDialog } from './CreateRecipeFromMealDialog'

/** #982 share dialogs plus the #983 recipe sheet, kept out of AddMealDialog. */
export function useMealCompositionActions(library: readonly MealItem[]): {
  shareOne: (item: CalorieItem) => void
  shareMany: (items: readonly CalorieItem[]) => void
  openRecipe: (items: readonly CalorieItem[]) => void
  dialogs: ReactNode
} {
  const recipes = useRecipeStore((state) => state.recipes)
  const upsertRecipe = useRecipeStore((state) => state.upsertRecipe)
  const [shareItem, setShareItem] = useState<MealItem | null>(null)
  const [shareBatch, setShareBatch] = useState<MealItem[] | null>(null)
  const [recipeItems, setRecipeItems] = useState<CalorieItem[] | null>(null)

  function shareMany(items: readonly CalorieItem[]) {
    const next = calorieItemsToShareMealItems(items, library)
    if (next.length >= 2) setShareBatch(next)
    else if (next.length === 1) setShareItem(next[0] ?? null)
  }

  return {
    shareOne: (item) => shareMany([item]),
    shareMany,
    openRecipe: (items) => setRecipeItems([...items]),
    dialogs: (
      <>
        <ShareFoodDialog
          open={shareItem !== null}
          onOpenChange={(next) => {
            if (!next) setShareItem(null)
          }}
          item={shareItem}
        />
        <ShareFoodDialog
          open={shareBatch !== null}
          onOpenChange={(next) => {
            if (!next) setShareBatch(null)
          }}
          item={null}
          items={shareBatch}
        />
        <CreateRecipeFromMealDialog
          open={recipeItems !== null}
          onOpenChange={(next) => {
            if (!next) setRecipeItems(null)
          }}
          items={recipeItems}
          recipes={recipes}
          onSave={async (recipe: Recipe) => {
            await upsertRecipe(recipe)
          }}
        />
      </>
    ),
  }
}
