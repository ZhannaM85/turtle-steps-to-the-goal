import { describe, expect, it } from 'vitest'
import {
  mealSelectionTotals,
  recipeFromMealSelection,
} from './mealSelectionRecipe'

const bread = {
  id: 'a',
  name: 'Батон семейный',
  amountKcal: 94,
  amountG: 36,
  proteinG: 3,
  fatG: 1,
  carbsG: 18,
}
const butter = {
  id: 'b',
  name: 'Масло',
  amountKcal: 98,
  amountG: 13,
  proteinG: 0,
  fatG: 11,
  carbsG: 0,
}
const trout = {
  id: 'c',
  name: 'Форель',
  amountKcal: 74,
  amountG: 75,
  proteinG: 15,
  fatG: 2,
  carbsG: 0,
}

describe('mealSelectionRecipe (#983)', () => {
  it('sums the selection and scales per 100 g from total weight', () => {
    const totals = mealSelectionTotals([bread, butter, trout])
    expect(totals.amountKcal).toBe(266)
    expect(totals.amountG).toBe(124)
    expect(totals.proteinG).toBe(18)
    expect(totals.fatG).toBe(14)
    expect(totals.carbsG).toBe(18)
    expect(totals.per100g).toEqual({
      kcal100: 215,
      protein100: 14.5,
      fat100: 11.3,
      carbs100: 14.5,
    })
  })

  it('omits per 100 g when any dish has no weight', () => {
    const totals = mealSelectionTotals([
      bread,
      { ...butter, amountG: undefined },
    ])
    expect(totals.amountG).toBeUndefined()
    expect(totals.per100g).toBeNull()
  })

  it('saves one serving whose ingredients are the selected dishes', () => {
    const recipe = recipeFromMealSelection(
      '  Сэндвич с лососем  ',
      [bread, { id: 'x', amountKcal: 1 }, trout],
      '2026-09-23T12:00:00.000Z',
    )
    expect(recipe).toMatchObject({
      name: 'Сэндвич с лососем',
      servings: 1,
      createdAt: '2026-09-23T12:00:00.000Z',
      updatedAt: '2026-09-23T12:00:00.000Z',
    })
    expect(recipe?.ingredients.map((item) => item.name)).toEqual([
      'Батон семейный',
      'Форель',
    ])
    expect(recipe?.ingredients[0]).toMatchObject({
      amountKcal: 94,
      amountG: 36,
      proteinG: 3,
    })
    expect(recipeFromMealSelection('   ', [bread])).toBeNull()
  })
})
