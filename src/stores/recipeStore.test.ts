import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Recipe } from '@/domain/recipe'
import { db } from '@/infrastructure/persistence/indexeddb'
import { useRecipeStore } from './recipeStore'

function makeRecipe(overrides: Partial<Recipe> = {}): Recipe {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    name: 'Chili',
    ingredients: [],
    servings: 4,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

beforeEach(async () => {
  await db.recipes.clear()
  useRecipeStore.setState({ recipes: [], status: 'idle', error: null })
})

afterEach(async () => {
  await db.recipes.clear()
})

describe('useRecipeStore', () => {
  it('starts empty', () => {
    expect(useRecipeStore.getState().recipes).toEqual([])
  })

  it('loads persisted recipes', async () => {
    await db.recipes.put(makeRecipe({ name: 'Chili' }))

    await useRecipeStore.getState().loadRecipes()

    expect(useRecipeStore.getState().recipes.map((r) => r.name)).toEqual([
      'Chili',
    ])
    expect(useRecipeStore.getState().status).toBe('ready')
  })

  it('upsertRecipe creates a new recipe', async () => {
    const recipe = makeRecipe({ name: 'Chili' })

    await useRecipeStore.getState().upsertRecipe(recipe)

    expect(useRecipeStore.getState().recipes).toHaveLength(1)
    expect(useRecipeStore.getState().recipes[0].name).toBe('Chili')
  })

  it('upsertRecipe updates an existing recipe by id', async () => {
    const recipe = makeRecipe({ name: 'Chili', servings: 4 })
    await useRecipeStore.getState().upsertRecipe(recipe)

    await useRecipeStore.getState().upsertRecipe({ ...recipe, servings: 6 })

    const recipes = useRecipeStore.getState().recipes
    expect(recipes).toHaveLength(1)
    expect(recipes[0].servings).toBe(6)
  })

  it('deleteRecipe removes a recipe by id', async () => {
    const recipe = makeRecipe()
    await useRecipeStore.getState().upsertRecipe(recipe)

    await useRecipeStore.getState().deleteRecipe(recipe.id)

    expect(useRecipeStore.getState().recipes).toEqual([])
  })
})
