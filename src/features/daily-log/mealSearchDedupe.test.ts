import { describe, expect, it } from 'vitest'
import type { FoodItem } from '@/data/foods'
import type { MealItem } from '@/domain/mealItem'
import type { Recipe } from '@/domain/recipe'
import type { PickableItem } from './addMealDialogHelpers'
import {
  dedupeMealSearchMatches,
  displayedMacroKey,
} from './mealSearchDedupe'

function dish(
  name: string,
  kcal: number,
  protein: number,
  fat: number,
  carbs: number,
  id = name,
): PickableItem {
  const mealItem: MealItem & { lastAmountKcal: number } = {
    id,
    name,
    createdAt: '2026-09-25T00:00:00.000Z',
    updatedAt: '2026-09-25T00:00:00.000Z',
    lastAmountKcal: kcal,
    lastProteinG: protein,
    lastFatG: fat,
    lastCarbsG: carbs,
  }
  return { source: 'mealItem', mealItem }
}

function recipe(
  name: string,
  kcal: number,
  protein: number,
  fat: number,
  carbs: number,
  id = `recipe-${name}`,
): PickableItem {
  const saved: Recipe = {
    id,
    name,
    ingredients: [
      {
        id: `${id}-ing`,
        name: 'part',
        amountKcal: kcal,
        proteinG: protein,
        fatG: fat,
        carbsG: carbs,
      },
    ],
    servings: 1,
    createdAt: '2026-09-25T00:00:00.000Z',
    updatedAt: '2026-09-25T00:00:00.000Z',
  }
  return { source: 'recipe', recipe: saved }
}

function food(name: string, kcal: number): PickableItem {
  const item: FoodItem = {
    id: name,
    en: name,
    ru: name,
    kcal100: kcal,
    protein100: 1,
    fat100: 1,
    carbs100: 1,
  }
  return { source: 'food', food: item }
}

function textFor(item: PickableItem): string {
  if (item.source === 'food') return item.food.ru
  if (item.source === 'recipe') return item.recipe.name
  return item.mealItem.name
}

function names(items: PickableItem[]): string[] {
  return items.map(textFor)
}

describe('meal search dedupe (#995)', () => {
  it('rounds macros the way the search subtitle does', () => {
    expect(displayedMacroKey(18.4)).toBe('18')
    expect(displayedMacroKey(18.5)).toBe('19')
    expect(displayedMacroKey(18.6)).toBe('19')
    expect(displayedMacroKey(undefined)).toBe('')
  })

  it('shows one row when a recipe and a dish share a name and macros, and keeps the recipe', () => {
    const hits = dedupeMealSearchMatches(
      [
        dish('Бутерброд с форелью', 266, 18, 13, 19, 'dish'),
        recipe('Бутерброд с форелью', 266, 18, 13, 19, 'recipe'),
      ],
      textFor,
    )
    expect(hits).toHaveLength(1)
    expect(hits[0]?.item.source).toBe('recipe')
    expect(hits[0]?.hidden.map((item) => item.source)).toEqual(['mealItem'])
  })

  it('collapses two recipes that look the same and keeps the earlier one', () => {
    const hits = dedupeMealSearchMatches(
      [
        recipe('Бутерброд с форелью', 266, 18, 13, 19, 'first'),
        recipe('бутерброд с форелью', 266.4, 18.2, 13.4, 19.2, 'second'),
      ],
      textFor,
    )
    expect(hits).toHaveLength(1)
    expect(hits[0]?.item.source).toBe('recipe')
    if (hits[0]?.item.source !== 'recipe') return
    expect(hits[0].item.recipe.id).toBe('first')
    expect(hits[0].hidden).toHaveLength(1)
  })

  it('keeps distinct foods that share a prefix or differ in macros', () => {
    const hits = dedupeMealSearchMatches(
      [
        dish('Бутерброд с форелью', 266, 18, 13, 19),
        dish('Бутерброд с сыром', 266, 18, 13, 19, 'cheese'),
        dish('Бутерброд с форелью', 300, 20, 14, 22, 'other-macros'),
        food('Яблоко', 52),
      ],
      textFor,
    )
    expect(names(hits.map((hit) => hit.item))).toEqual([
      'Бутерброд с форелью',
      'Бутерброд с сыром',
      'Бутерброд с форелью',
      'Яблоко',
    ])
    expect(hits.every((hit) => hit.hidden.length === 0)).toBe(true)
  })
})
