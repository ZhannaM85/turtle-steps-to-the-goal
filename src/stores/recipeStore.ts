import { create } from 'zustand'
import type { Recipe } from '@/domain/recipe'
import { IndexedDbRecipeRepository } from '@/infrastructure/persistence/indexeddb'

const recipeRepository = new IndexedDbRecipeRepository()

interface RecipeStoreState {
  recipes: Recipe[]
  status: 'idle' | 'loading' | 'ready' | 'error'
  error: string | null
  loadRecipes: () => Promise<void>
  /** The caller builds the full `Recipe` object (name, ingredients,
   * servings) — unlike `mealItemStore.touch`, there's no unique-name
   * index to reconcile against, so this is a plain upsert-by-id. */
  upsertRecipe: (recipe: Recipe) => Promise<void>
  deleteRecipe: (id: string) => Promise<void>
}

export const useRecipeStore = create<RecipeStoreState>((set) => ({
  recipes: [],
  status: 'idle',
  error: null,
  loadRecipes: async () => {
    set({ status: 'loading', error: null })
    try {
      const recipes = await recipeRepository.getAll()
      set({ recipes, status: 'ready' })
    } catch (err) {
      set({
        status: 'error',
        error: err instanceof Error ? err.message : 'Failed to load recipes',
      })
    }
  },
  upsertRecipe: async (recipe) => {
    await recipeRepository.upsert(recipe)
    set({ recipes: await recipeRepository.getAll() })
  },
  deleteRecipe: async (id) => {
    await recipeRepository.delete(id)
    set({ recipes: await recipeRepository.getAll() })
  },
}))
