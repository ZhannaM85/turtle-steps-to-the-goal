import { describe, expect, it } from 'vitest'
import type { MealItem } from '@/domain/mealItem'
import type { Recipe } from '@/domain/recipe'
import type { PickableItem } from './addMealDialogHelpers'
import {
  catalogHomemadeForName,
  filterToHomemadeDishes,
  isHomemadePickableItem,
} from './homemadeFoodFilter'

function meal(name: string, homemade?: boolean): PickableItem {
  const mealItem = {
    id: name,
    name,
    createdAt: '2026-09-25T00:00:00.000Z',
    updatedAt: '2026-09-25T00:00:00.000Z',
    lastAmountKcal: 100,
    homemade,
  } as MealItem & { lastAmountKcal: number }
  return { source: 'mealItem', mealItem }
}

const recipe: PickableItem = {
  source: 'recipe',
  recipe: {
    id: 'recipe-1',
    name: 'Бутерброд с форелью',
    ingredients: [],
    servings: 1,
    createdAt: '2026-09-25T00:00:00.000Z',
    updatedAt: '2026-09-25T00:00:00.000Z',
  } satisfies Recipe,
}

describe('homemade food filter (#994)', () => {
  const homemade = meal('Домашний гуляш', true)
  const packaged = meal('Творожная запеканка')

  it('treats a missing flag as not homemade', () => {
    expect(isHomemadePickableItem(packaged)).toBe(false)
    expect(isHomemadePickableItem(homemade)).toBe(true)
    expect(isHomemadePickableItem(recipe)).toBe(false)
  })

  it('keeps every dish when the filter is off, including homemade ones', () => {
    const items = [homemade, packaged, recipe]
    expect(filterToHomemadeDishes(items, false)).toEqual(items)
  })

  it('keeps only homemade catalog dishes when the filter is on', () => {
    expect(filterToHomemadeDishes([homemade, packaged, recipe], true)).toEqual([
      homemade,
    ])
  })

  it('reads the catalog flag by normalized dish name', () => {
    const items = [
      { name: 'Домашний гуляш', homemade: true },
      { name: 'Творожная запеканка' },
    ]
    expect(catalogHomemadeForName('  Домашний гуляш\u00A0', items)).toBe(true)
    expect(catalogHomemadeForName('Творожная запеканка', items)).toBe(false)
  })
})
