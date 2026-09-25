import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { MealItem } from '@/domain/mealItem'
import type { Recipe } from '@/domain/recipe'
import { db } from '@/infrastructure/persistence/indexeddb'
import { useMealItemStore, useRecipeStore } from '@/stores'
import type { PickableItem } from './addMealDialogHelpers'
import {
  deleteMealSearchPickable,
  isCatalogDeleteBlocked,
  mealSearchDeleteMode,
} from './catalogItemDelete'

function dish(id: string, name: string): PickableItem {
  const mealItem: MealItem & { lastAmountKcal: number } = {
    id,
    name,
    createdAt: '2026-09-25T00:00:00.000Z',
    updatedAt: '2026-09-25T00:00:00.000Z',
    lastAmountKcal: 266,
    lastProteinG: 18,
    lastFatG: 13,
    lastCarbsG: 19,
  }
  return { source: 'mealItem', mealItem }
}

function recipe(id: string, name: string): PickableItem {
  const saved: Recipe = {
    id,
    name,
    ingredients: [
      {
        id: `${id}-ing`,
        name: 'part',
        amountKcal: 266,
        proteinG: 18,
        fatG: 13,
        carbsG: 19,
      },
    ],
    servings: 1,
    createdAt: '2026-09-25T00:00:00.000Z',
    updatedAt: '2026-09-25T00:00:00.000Z',
  }
  return { source: 'recipe', recipe: saved }
}

beforeEach(async () => {
  await db.mealItems.clear()
  await db.recipes.clear()
  await db.dailyEntries.clear()
  useMealItemStore.setState({ items: [], status: 'idle', error: null })
  useRecipeStore.setState({ recipes: [], status: 'idle', error: null })
})

afterEach(async () => {
  await db.mealItems.clear()
  await db.recipes.clear()
  await db.dailyEntries.clear()
})

describe('catalog delete guard (#995)', () => {
  const named = recipe('recipe-1', 'Бутерброд с форелью')
  const history = [
    {
      id: 'day',
      date: '2026-09-25',
      calorieEntries: [
        {
          id: 'meal',
          items: [
            {
              id: 'line',
              name: 'Бутерброд с форелью',
              amountKcal: 266,
            },
          ],
          createdAt: '2026-09-25T00:00:00.000Z',
        },
      ],
      createdAt: '2026-09-25T00:00:00.000Z',
      updatedAt: '2026-09-25T00:00:00.000Z',
    },
  ]

  it('asks to delete the extra copy when a dish is hidden behind the recipe', () => {
    expect(mealSearchDeleteMode(named, [dish('dish-1', 'Бутерброд с форелью')])).toBe(
      'duplicate',
    )
  })

  it('blocks the last catalog row whose name is still in meal history', () => {
    if (named.source !== 'recipe') return
    expect(
      isCatalogDeleteBlocked(named, history, [
        { id: 'recipe-1', name: 'Бутерброд с форелью' },
      ]),
    ).toBe(true)
    expect(
      isCatalogDeleteBlocked(named, history, [
        { id: 'recipe-1', name: 'Бутерброд с форелью' },
        { id: 'dish-1', name: 'Бутерброд с форелью' },
      ]),
    ).toBe(false)
    expect(
      isCatalogDeleteBlocked(named, [], [
        { id: 'recipe-1', name: 'Бутерброд с форелью' },
      ]),
    ).toBe(false)
  })

  it('removes the hidden dish and leaves the recipe', async () => {
    const kept = recipe('recipe-1', 'Бутерброд с форелью')
    const extra = dish('dish-1', 'Бутерброд с форелью')
    if (kept.source !== 'recipe' || extra.source !== 'mealItem') return
    await useRecipeStore.getState().upsertRecipe(kept.recipe)
    await useMealItemStore.getState().touch(extra.mealItem.name, {
      amountKcal: extra.mealItem.lastAmountKcal,
      proteinG: 18,
      fatG: 13,
      carbsG: 19,
    })
    const storedDish = useMealItemStore
      .getState()
      .items.find((item) => item.name === 'Бутерброд с форелью')
    expect(storedDish).toBeDefined()
    const hidden = dish(storedDish?.id ?? 'dish-1', 'Бутерброд с форелью')

    await deleteMealSearchPickable(kept, [hidden])

    expect(useRecipeStore.getState().recipes.map((item) => item.id)).toEqual([
      'recipe-1',
    ])
    expect(useMealItemStore.getState().items).toEqual([])
  })

  it('refuses to delete the only recipe still named in a saved meal', async () => {
    const only = recipe('recipe-1', 'Бутерброд с форелью')
    if (only.source !== 'recipe') return
    await useRecipeStore.getState().upsertRecipe(only.recipe)
    await db.dailyEntries.put({
      id: 'day',
      date: '2026-09-25',
      calorieEntries: [
        {
          id: 'meal',
          items: [
            { id: 'line', name: 'Бутерброд с форелью', amountKcal: 266 },
          ],
          createdAt: '2026-09-25T00:00:00.000Z',
        },
      ],
      createdAt: '2026-09-25T00:00:00.000Z',
      updatedAt: '2026-09-25T00:00:00.000Z',
    })

    await expect(deleteMealSearchPickable(only, [])).resolves.toBe('in-use')
    expect(useRecipeStore.getState().recipes).toHaveLength(1)
  })
})
