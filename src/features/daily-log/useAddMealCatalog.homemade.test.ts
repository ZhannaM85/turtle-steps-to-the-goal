import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { MealItem } from '@/domain/mealItem'
import type { Recipe } from '@/domain/recipe'
import { useMealItemStore, useRecipeStore } from '@/stores'
import { useAddMealCatalog } from './useAddMealCatalog'

function meal(name: string, homemade?: boolean): MealItem {
  return {
    id: name,
    name,
    createdAt: '2026-09-25T00:00:00.000Z',
    updatedAt: '2026-09-25T00:00:00.000Z',
    lastAmountKcal: 100,
    homemade,
  }
}

const recipe: Recipe = {
  id: 'recipe-1',
  name: 'Бутерброд с форелью',
  ingredients: [],
  servings: 1,
  createdAt: '2026-09-25T00:00:00.000Z',
  updatedAt: '2026-09-25T00:00:00.000Z',
}

function names(items: { source: string; mealItem?: { name: string }; recipe?: { name: string }; food?: { ru: string } }[]) {
  return items.map((item) => {
    if (item.source === 'mealItem') return item.mealItem?.name
    if (item.source === 'recipe') return item.recipe?.name
    return item.food?.ru
  })
}

describe('meal search homemade chip (#994)', () => {
  it('lists only homemade dishes when the chip is on, and still finds them by name when it is off', () => {
    useMealItemStore.setState({
      items: [meal('Домашний гуляш', true), meal('Творожная запеканка')],
    })
    useRecipeStore.setState({ recipes: [recipe] })

    const { result, rerender } = renderHook(
      ({ search }: { search: string }) =>
        useAddMealCatalog({
          locale: 'ru',
          isOnline: false,
          search,
          setSearch: () => {},
          openPickedItemSheet: () => {},
        }),
      { initialProps: { search: '' } },
    )

    expect(names(result.current.recentItems)).toEqual([
      'Домашний гуляш',
      'Творожная запеканка',
    ])

    act(() => result.current.toggleHomemadeOnly())
    expect(result.current.homemadeOnly).toBe(true)
    expect(names(result.current.recentItems)).toEqual(['Домашний гуляш'])

    rerender({ search: 'гуляш' })
    expect(names(result.current.matches)).toEqual(['Домашний гуляш'])

    rerender({ search: 'запекан' })
    expect(result.current.matches).toEqual([])

    rerender({ search: 'бутер' })
    expect(result.current.matches).toEqual([])

    act(() => result.current.toggleHomemadeOnly())
    rerender({ search: 'гуляш' })
    expect(names(result.current.matches)).toContain('Домашний гуляш')

    rerender({ search: 'бутер' })
    expect(names(result.current.matches)).toContain('Бутерброд с форелью')
  })
})
