import { describe, expect, it } from 'vitest'
import type { FoodItem } from '@/data/foods'
import type { CatalogFoodImport } from '@/domain/catalogFoodImport'
import type { MealItem } from '@/domain/mealItem'
import type { PickableItem } from './addMealDialogHelpers'
import { rankRecentMealPickables } from './recentMealPickables'

function food(ru: string, en = ru): FoodItem {
  return {
    id: ru,
    en,
    ru,
    kcal100: 10,
    protein100: 1,
    fat100: 1,
    carbs100: 1,
  }
}

function meal(name: string, updatedAt: string): PickableItem {
  const mealItem = {
    id: name,
    name,
    createdAt: updatedAt,
    updatedAt,
    lastAmountKcal: 100,
  } as MealItem & { lastAmountKcal: number }
  return { source: 'mealItem', mealItem }
}

function imported(nameRu: string, updatedAt: string, nameEn?: string): CatalogFoodImport {
  return {
    nameRu,
    nameEn,
    kcal100: 10,
    protein100: 1,
    fat100: 1,
    carbs100: 1,
    cholesterolImpact: 'unknown',
    updatedAt,
  }
}

function names(items: PickableItem[]): string[] {
  return items.map((item) =>
    item.source === 'mealItem' ? item.mealItem.name : item.source === 'food' ? item.food.ru : '',
  )
}

describe('rankRecentMealPickables (#1035)', () => {
  it('puts the last pasted food first and keeps an older diary food below', () => {
    const foods = [
      food('Лосось/форель на гриле'),
      food('Стручковая фасоль'),
      food('Лимон', 'Lemon'),
    ]
    const ranked = rankRecentMealPickables({
      mealItems: [meal('Куриные котлеты жареные', '2026-09-26T12:00:00.000Z')],
      foods,
      imports: [
        imported('Лосось/форель на гриле', '2026-09-27T18:00:00.000Z'),
        imported('Стручковая фасоль', '2026-09-27T18:00:00.001Z'),
        imported('Лимон', '2026-09-27T18:00:00.002Z', 'Lemon'),
      ],
    })
    expect(names(ranked)).toEqual([
      'Лимон',
      'Стручковая фасоль',
      'Лосось/форель на гриле',
      'Куриные котлеты жареные',
    ])
    expect(ranked[0]?.source).toBe('food')
  })

  it('lets a later log of the same name replace the imported row', () => {
    const ranked = rankRecentMealPickables({
      mealItems: [
        meal('Лимон', '2026-09-27T19:00:00.000Z'),
        meal('Куриные котлеты жареные', '2026-09-26T12:00:00.000Z'),
      ],
      foods: [food('Лимон', 'Lemon')],
      imports: [imported('Лимон', '2026-09-27T18:00:00.000Z', 'Lemon')],
    })
    expect(names(ranked)).toEqual(['Лимон', 'Куриные котлеты жареные'])
    expect(ranked[0]?.source).toBe('mealItem')
  })

  it('ranks a later meal add above an older import, and a later import above an older meal add (#1051)', () => {
    const foods = [food('Салат Коул слоу', 'Coleslaw'), food('Тестовый импорт')]
    const mealFirst = rankRecentMealPickables({
      mealItems: [meal('Салат Коул слоу', '2026-09-29T18:00:00.000Z')],
      foods,
      imports: [imported('Тестовый импорт', '2026-09-29T12:00:00.000Z')],
    })
    expect(names(mealFirst)).toEqual(['Салат Коул слоу', 'Тестовый импорт'])
    expect(mealFirst[0]?.source).toBe('mealItem')

    const importFirst = rankRecentMealPickables({
      mealItems: [meal('Салат Коул слоу', '2026-09-29T12:00:00.000Z')],
      foods,
      imports: [imported('Тестовый импорт', '2026-09-29T18:00:00.000Z')],
    })
    expect(names(importFirst)).toEqual(['Тестовый импорт', 'Салат Коул слоу'])
    expect(importFirst[0]?.source).toBe('food')
  })

  it('keeps two diary rows that share a name', () => {
    const ranked = rankRecentMealPickables({
      mealItems: [
        meal('Бутерброд с форелью', '2026-09-27T19:00:00.000Z'),
        meal('Бутерброд с форелью', '2026-09-26T12:00:00.000Z'),
      ],
      foods: [],
      imports: [],
    })
    expect(ranked).toHaveLength(2)
    expect(ranked.every((item) => item.source === 'mealItem')).toBe(true)
  })
})
