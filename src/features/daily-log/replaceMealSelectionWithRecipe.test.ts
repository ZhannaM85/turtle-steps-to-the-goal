import { describe, expect, it } from 'vitest'
import type { CalorieEntry, CalorieItem } from '@/domain/dailyEntry'
import { recipeFromMealSelection } from './mealSelectionRecipe'
import { mealTotalsSoFar } from './addMealDialogPreviews'
import {
  calorieItemForRecipeServing,
  replaceSelectedItemsInEntries,
  replaceSelectedMealItems,
} from './replaceMealSelectionWithRecipe'

const bread: CalorieItem = {
  id: 'bread',
  name: 'Батон семейный',
  amountKcal: 94,
  amountG: 36,
  proteinG: 3,
  fatG: 1,
  carbsG: 18,
  fiberG: 2,
  sodiumMg: 120,
}
const butter: CalorieItem = {
  id: 'butter',
  name: 'Масло',
  amountKcal: 98,
  amountG: 13,
  proteinG: 0,
  fatG: 11,
  carbsG: 0,
  fiberG: 0,
}
const trout: CalorieItem = {
  id: 'trout',
  name: 'Форель',
  amountKcal: 74,
  amountG: 75,
  proteinG: 15,
  fatG: 2,
  carbsG: 0,
  potassiumMg: 300,
}
const tea: CalorieItem = {
  id: 'tea',
  name: 'Чай',
  amountKcal: 2,
  proteinG: 0,
  fatG: 0,
  carbsG: 0,
}

describe('replaceMealSelectionWithRecipe (#987)', () => {
  it('replaces the selected foods with one serving and keeps meal totals', () => {
    const selected = [bread, butter, trout]
    const recipe = recipeFromMealSelection('Бутерброд', selected, '2026-09-25T00:00:00.000Z')
    expect(recipe).not.toBeNull()
    if (!recipe) return
    const line = calorieItemForRecipeServing(recipe, selected)
    const before = [tea, bread, butter, trout]
    const after = replaceSelectedMealItems(
      before,
      selected.map((item) => item.id),
      line,
    )

    expect(after.map((item) => item.name)).toEqual(['Чай', 'Бутерброд'])
    expect(after[1]).toMatchObject({
      amountKcal: 266,
      proteinG: 18,
      fatG: 14,
      carbsG: 18,
      amountG: 124,
      fiberG: 2,
      sodiumMg: 120,
      potassiumMg: 300,
    })
    expect(mealTotalsSoFar(after)).toEqual(mealTotalsSoFar(before))
  })

  it('replaces only the target meal and keeps that meal’s totals', () => {
    const recipe = recipeFromMealSelection('Бутерброд', [bread, butter])
    expect(recipe).not.toBeNull()
    if (!recipe) return
    const line = calorieItemForRecipeServing(recipe, [bread, butter])
    const lunch: CalorieEntry = {
      id: 'lunch',
      items: [bread, butter],
      createdAt: '2026-09-25T00:00:00.000Z',
    }
    const dinner: CalorieEntry = {
      id: 'dinner',
      items: [trout],
      createdAt: '2026-09-25T00:00:00.000Z',
    }
    const next = replaceSelectedItemsInEntries(
      [lunch, dinner],
      'lunch',
      ['bread', 'butter'],
      line,
    )
    expect(next[0]?.items.map((item) => item.name)).toEqual(['Бутерброд'])
    expect(next[1]).toBe(dinner)
    expect(mealTotalsSoFar(next[0]?.items ?? [])).toEqual(
      mealTotalsSoFar(lunch.items),
    )
  })
})
