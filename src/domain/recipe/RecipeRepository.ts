import type { Recipe } from './Recipe'

export interface RecipeRepository {
  getAll(): Promise<Recipe[]>
  upsert(recipe: Recipe): Promise<void>
  delete(id: string): Promise<void>
}
