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
  grams?: number,
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
    lastAmountG: grams,
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
  grams?: number,
  servings = 1,
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
        amountG: grams,
      },
    ],
    servings,
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

  it('collapses the same dish when per-100g macros match across portion sizes (#1006)', () => {
    const hits = dedupeMealSearchMatches(
      [
        dish('Бутерброд с форелью', 129, 9, 7, 9, 'logged', 100),
        recipe('Бутерброд с форелью', 266, 18, 13, 19, 'recipe', 200),
      ],
      textFor,
    )
    expect(hits).toHaveLength(1)
    expect(hits[0]?.item.source).toBe('recipe')
    expect(hits[0]?.hidden.map((item) => item.source)).toEqual(['mealItem'])
  })

  it('divides a multi-serving recipe down to per-100g before comparing (#1006)', () => {
    const hits = dedupeMealSearchMatches(
      [
        dish('Бутерброд с форелью', 129, 9, 7, 9, 'logged', 100),
        recipe('Бутерброд с форелью', 532, 36, 26, 38, 'recipe', 400, 2),
      ],
      textFor,
    )
    expect(hits).toHaveLength(1)
    expect(hits[0]?.item.source).toBe('recipe')
  })

  it('keeps the same name when per-100g density differs (#1006)', () => {
    const hits = dedupeMealSearchMatches(
      [
        dish('Бутерброд с форелью', 129, 9, 7, 9, 'light', 100),
        dish('Бутерброд с форелью', 266, 18, 13, 19, 'dense', 100),
      ],
      textFor,
    )
    expect(names(hits.map((hit) => hit.item))).toEqual([
      'Бутерброд с форелью',
      'Бутерброд с форелью',
    ])
    expect(hits.every((hit) => hit.hidden.length === 0)).toBe(true)
  })
})
