import { describe, expect, it } from 'vitest'
import type { Recipe } from '@/domain/recipe'
import { en } from '@/i18n/en'
import { buildRecipeShoppingListText } from './recipeShoppingList'

const baseRecipe: Recipe = {
  id: 'recipe-1',
  name: 'Chili',
  servings: 6,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ingredients: [
    { id: 'i1', name: 'Chicken breast', amountKcal: 495, amountG: 300 },
    { id: 'i2', name: 'Rice', amountKcal: 260, amountG: 200 },
    { id: 'i3', name: 'A pinch of salt', amountKcal: 0 },
  ],
}

describe('buildRecipeShoppingListText', () => {
  it('lists the recipe name followed by one bulleted line per ingredient', () => {
    expect(buildRecipeShoppingListText(baseRecipe, 'en', en)).toBe(
      [
        'Chili',
        '- Chicken breast (300g)',
        '- Rice (200g)',
        '- A pinch of salt',
      ].join('\n'),
    )
  })

  it('omits the amount for an ingredient with no recorded grams', () => {
    const recipe: Recipe = {
      ...baseRecipe,
      ingredients: [{ id: 'i1', name: 'Salt to taste', amountKcal: 0 }],
    }
    expect(buildRecipeShoppingListText(recipe, 'en', en)).toBe(
      'Chili\n- Salt to taste',
    )
  })
})
