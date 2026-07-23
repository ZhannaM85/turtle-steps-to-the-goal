import type { Recipe, RecipeRepository } from '@/domain/recipe'
import { db } from './db'

export class IndexedDbRecipeRepository implements RecipeRepository {
  async getAll(): Promise<Recipe[]> {
    return (await db.recipes.toArray()).sort((a, b) =>
      a.name.localeCompare(b.name),
    )
  }

  async upsert(recipe: Recipe): Promise<void> {
    await db.recipes.put(recipe)
  }

  async delete(id: string): Promise<void> {
    await db.recipes.delete(id)
  }
}
