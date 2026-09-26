import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { MealItem } from '@/domain/mealItem'
import type { Recipe } from '@/domain/recipe'
import { useMealItemStore, useRecipeStore } from '@/stores'
import { useAddMealCatalog } from './useAddMealCatalog'

function dish(id: string, name: string, kcal: number): MealItem {
  return {
    id,
    name,
    createdAt: '2026-09-25T00:00:00.000Z',
    updatedAt: '2026-09-25T00:00:00.000Z',
    lastAmountKcal: kcal,
    lastProteinG: 18,
    lastFatG: 13,
    lastCarbsG: 19,
  }
}

function savedRecipe(id: string, name: string, kcal: number): Recipe {
  return {
    id,
    name,
    ingredients: [
      {
        id: `${id}-ing`,
        name: 'part',
        amountKcal: kcal,
        proteinG: 18,
        fatG: 13,
        carbsG: 19,
      },
    ],
    servings: 1,
    createdAt: '2026-09-25T00:00:00.000Z',
    updatedAt: '2026-09-25T00:00:00.000Z',
  }
}

describe('meal search catalog dedupe (#995)', () => {
  it('returns one recipe row for «Бутер» when a dish and a second recipe match', () => {
    useMealItemStore.setState({
      items: [
        dish('dish', 'Бутерброд с форелью', 266),
        dish('cheese', 'Бутерброд с сыром', 266),
        dish('other', 'Бутерброд с форелью', 300),
      ],
    })
    useRecipeStore.setState({
      recipes: [
        savedRecipe('recipe-a', 'Бутерброд с форелью', 266),
        savedRecipe('recipe-b', 'Бутерброд с форелью', 266),
      ],
    })

    const { result } = renderHook(() =>
      useAddMealCatalog({
        locale: 'ru',
        isOnline: false,
        search: 'Бутер',
        setSearch: () => {},
        openPickedItemSheet: () => {},
      }),
    )

    const trout = result.current.matches.filter((item) => {
      const name =
        item.source === 'recipe'
          ? item.recipe.name
          : item.source === 'mealItem'
            ? item.mealItem.name
            : item.food.ru
      return name === 'Бутерброд с форелью'
    })
    expect(trout).toHaveLength(2)
    expect(trout.map((item) => item.source)).toEqual(['recipe', 'mealItem'])
    const kept = trout[0]
    expect(kept?.source).toBe('recipe')
    if (kept?.source !== 'recipe') return
    expect(kept.recipe.id).toBe('recipe-a')
    expect(result.current.deleteMode(kept)).toBe('duplicate')
    expect(
      result.current.matches.some(
        (item) =>
          item.source === 'mealItem' && item.mealItem.name === 'Бутерброд с сыром',
      ),
    ).toBe(true)
  })

  it('returns one trout row when the logged portion and the recipe share per-100g macros (#1006)', () => {
    useMealItemStore.setState({
      items: [
        {
          ...dish('logged', 'Бутерброд с форелью', 129),
          lastProteinG: 9,
          lastFatG: 7,
          lastCarbsG: 9,
          lastAmountG: 100,
        },
      ],
    })
    useRecipeStore.setState({
      recipes: [
        {
          ...savedRecipe('recipe', 'Бутерброд с форелью', 266),
          ingredients: [
            {
              id: 'recipe-ing',
              name: 'part',
              amountKcal: 266,
              proteinG: 18,
              fatG: 13,
              carbsG: 19,
              amountG: 200,
            },
          ],
        },
      ],
    })

    const { result } = renderHook(() =>
      useAddMealCatalog({
        locale: 'ru',
        isOnline: false,
        search: 'Бутер',
        setSearch: () => {},
        openPickedItemSheet: () => {},
      }),
    )

    const trout = result.current.matches.filter((item) => {
      const name =
        item.source === 'recipe'
          ? item.recipe.name
          : item.source === 'mealItem'
            ? item.mealItem.name
            : item.food.ru
      return name === 'Бутерброд с форелью'
    })
    expect(trout).toHaveLength(1)
    expect(trout[0]?.source).toBe('recipe')
  })
})
