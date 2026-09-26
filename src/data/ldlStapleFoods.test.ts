import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { CalorieItem } from '@/domain/dailyEntry'
import { backfillDailyEntryCholesterol } from '@/domain/cholesterol'
import { draftFromPickableItem } from '@/features/daily-log/addMealDialogHelpers'
import { useAddMealCatalog } from '@/features/daily-log/useAddMealCatalog'
import {
  useFoodOverrideStore,
  useMealItemStore,
  useRecipeStore,
} from '@/stores'
import { foods } from './foods'
import { LDL_STAPLE_FOODS, mergeLdlStaples } from './ldlStapleFoods'

describe('LDL staple catalog (#1010)', () => {
  it('merges each staple once and leaves a second merge unchanged', () => {
    expect(LDL_STAPLE_FOODS).toHaveLength(15)
    for (const staple of LDL_STAPLE_FOODS) {
      const rows = foods.filter((food) => food.ru === staple.nameRu)
      expect(rows).toHaveLength(1)
      expect(rows[0]).toMatchObject({
        kcal100: staple.kcal100,
        protein100: staple.protein100,
        fat100: staple.fat100,
        carbs100: staple.carbs100,
        cholesterolImpact: 'beneficial',
        cholesterolReason: staple.cholesterolReason,
      })
      expect(staple.cholesterolReason).not.toMatch(/LDL/)
      expect(staple.cholesterolReason).toMatch(/[А-Яа-яЁё]/)
    }
    expect(mergeLdlStaples(foods)).toEqual(foods)
  })

  it('updates an exact name in place and does not touch a different food', () => {
    const broccoli = foods.find((food) => food.ru === 'Брокколи')
    const chia = foods.find((food) => food.ru === 'Семена чиа')
    const chicken = foods.find((food) => food.id === 'chicken-breast')
    const cookedOats = foods.find((food) => food.ru === 'Овсянка, варёная')
    expect(broccoli?.id).toBe('broccoli')
    expect(broccoli?.kcal100).toBe(35)
    expect(chia?.id).toBe('chia-seeds')
    expect(chia?.carbs100).toBe(42.1)
    expect(chicken).toMatchObject({
      kcal100: 165,
      protein100: 31,
      fat100: 3.6,
      carbs100: 0,
    })
    expect(chicken?.cholesterolImpact).toBeUndefined()
    expect(cookedOats).toMatchObject({
      kcal100: 71,
      protein100: 2.5,
      fat100: 1.5,
      carbs100: 12,
    })
    expect(cookedOats?.cholesterolImpact).toBeUndefined()
  })

  it('meal search returns the catalog row, LDL included, with no cholesterol-list join', () => {
    useMealItemStore.setState({ items: [] })
    useRecipeStore.setState({ recipes: [] })
    useFoodOverrideStore.setState({ overrides: [] })

    const flaxRecord = foods.find((food) => food.ru === 'Семена льна')
    const oatsRecord = foods.find((food) => food.ru === 'Овсянка')
    expect(flaxRecord?.cholesterolReason).toMatch(/клетчатк/)
    expect(flaxRecord?.cholesterolReason).not.toMatch(/LDL/)

    const flaxSearch = renderHook(() =>
      useAddMealCatalog({
        locale: 'ru',
        isOnline: false,
        search: 'Семена льна',
        setSearch: () => {},
        openPickedItemSheet: () => {},
      }),
    )
    const flaxHit = flaxSearch.result.current.matches.find(
      (item) => item.source === 'food' && item.food.ru === 'Семена льна',
    )
    expect(flaxHit?.source).toBe('food')
    if (flaxHit?.source !== 'food') return
    expect(flaxHit.food).toBe(flaxRecord)
    expect(flaxHit.food).toMatchObject({
      kcal100: 534,
      protein100: 18.3,
      fat100: 42.2,
      carbs100: 28.9,
      cholesterolImpact: 'beneficial',
      cholesterolReason: flaxRecord?.cholesterolReason,
    })

    const oatsSearch = renderHook(() =>
      useAddMealCatalog({
        locale: 'ru',
        isOnline: false,
        search: 'Овсянка',
        setSearch: () => {},
        openPickedItemSheet: () => {},
      }),
    )
    const oatsHit = oatsSearch.result.current.matches.find(
      (item) => item.source === 'food' && item.food.ru === 'Овсянка',
    )
    expect(oatsHit?.source).toBe('food')
    if (oatsHit?.source !== 'food') return
    expect(oatsHit.food).toBe(oatsRecord)
    expect(oatsHit.food).toMatchObject({
      kcal100: 71,
      protein100: 2.5,
      fat100: 1.5,
      carbs100: 12,
      cholesterolImpact: 'beneficial',
    })

    const draft = draftFromPickableItem(flaxHit, 'ru')
    expect(draft.draft).toMatchObject({
      name: 'Семена льна',
      amount: '534',
      protein: '18.3',
      fat: '42.2',
      carbs: '28.9',
      macroMode: 'per100g',
    })
  })

  it('stamps LDL from the catalog row and leaves logged calories alone', () => {
    const item: CalorieItem = {
      id: 'dish-flax',
      name: 'Семена льна',
      amountKcal: 50,
      proteinG: 1,
      fatG: 4,
      carbsG: 2,
      amountG: 10,
    }
    const entry = {
      id: 'day-1',
      date: '2026-09-26',
      createdAt: '2026-09-26T08:00:00.000Z',
      updatedAt: '2026-09-26T08:00:00.000Z',
      calorieEntries: [
        {
          id: 'meal-1',
          createdAt: '2026-09-26T08:30:00.000Z',
          timeEaten: '08:30',
          items: [item],
        },
      ],
    }
    backfillDailyEntryCholesterol(entry)
    const dish = entry.calorieEntries[0]?.items[0]
    expect(dish?.cholesterolImpact).toBe('beneficial')
    expect(dish?.cholesterolReason).toMatch(/клетчатк/)
    expect(dish?.amountKcal).toBe(50)
    expect(dish?.proteinG).toBe(1)
    expect(dish?.fatG).toBe(4)
    expect(dish?.carbsG).toBe(2)
    expect(dish?.amountG).toBe(10)
    expect(dish?.name).toBe('Семена льна')
  })
})
