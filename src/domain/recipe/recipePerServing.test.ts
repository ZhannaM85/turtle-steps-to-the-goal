import { describe, expect, it } from 'vitest'
import type { Recipe, RecipeIngredient } from './Recipe'
import { recipePerServing, recipeServingsTotal } from './recipePerServing'

function ingredient(overrides: Partial<RecipeIngredient> = {}): RecipeIngredient {
  return {
    id: crypto.randomUUID(),
    name: 'Ingredient',
    amountKcal: 100,
    ...overrides,
  }
}

function recipe(overrides: Partial<Recipe> = {}): Recipe {
  const now = '2026-01-01T00:00:00.000Z'
  return {
    id: 'recipe-1',
    name: 'Chili',
    ingredients: [],
    servings: 1,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

describe('recipePerServing', () => {
  it('divides the combined kcal by the number of servings', () => {
    const r = recipe({
      ingredients: [
        ingredient({ amountKcal: 800 }),
        ingredient({ amountKcal: 1200 }),
      ],
      servings: 4,
    })

    expect(recipePerServing(r).amountKcal).toBe(500)
  })

  it('divides each macro independently, undefined when none of the ingredients logged it', () => {
    const r = recipe({
      ingredients: [
        ingredient({ amountKcal: 400, proteinG: 40, fatG: 20 }),
        ingredient({ amountKcal: 400, proteinG: 20 }),
      ],
      servings: 2,
    })

    const perServing = recipePerServing(r)
    expect(perServing.amountKcal).toBe(400)
    expect(perServing.proteinG).toBe(30)
    expect(perServing.fatG).toBe(10)
    expect(perServing.carbsG).toBeUndefined()
  })

  it('returns 0 kcal for a recipe with no ingredients yet', () => {
    const r = recipe({ ingredients: [], servings: 4 })

    expect(recipePerServing(r).amountKcal).toBe(0)
  })
})

describe('recipeServingsTotal', () => {
  it('scales the per-serving totals by how many servings were eaten', () => {
    const r = recipe({
      ingredients: [ingredient({ amountKcal: 800, proteinG: 40, carbsG: 100 })],
      servings: 4,
    })

    const total = recipeServingsTotal(r, 2)
    expect(total.amountKcal).toBe(400)
    expect(total.proteinG).toBe(20)
    expect(total.carbsG).toBe(50)
    expect(total.fatG).toBeUndefined()
  })

  it('scales down for less than one serving', () => {
    const r = recipe({
      ingredients: [ingredient({ amountKcal: 1000 })],
      servings: 2,
    })

    expect(recipeServingsTotal(r, 0.5).amountKcal).toBe(250)
  })
})
