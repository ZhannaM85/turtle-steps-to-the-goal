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
    expect(LDL_STAPLE_FOODS).toHaveLength(16)
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

  it('finds Салат Коул слоу with per-100 g macros and beneficial LDL (#1014)', () => {
    useMealItemStore.setState({ items: [] })
    useRecipeStore.setState({ recipes: [] })
    useFoodOverrideStore.setState({ overrides: [] })

    const rows = foods.filter((food) => food.ru === 'Салат Коул слоу')
    expect(rows).toHaveLength(1)
    const salad = rows[0]
    expect(salad).toMatchObject({
      id: 'salad-coleslaw',
      en: 'Coleslaw',
      kcal100: 95,
      protein100: 1.4,
      fat100: 7.5,
      carbs100: 6.3,
      cholesterolImpact: 'beneficial',
    })
    expect(salad?.cholesterolReason).toMatch(/ЛПНП/)
    expect(salad?.cholesterolReason).not.toMatch(/LDL/)

    const usda = foods.find((food) => food.id === 'coleslaw')
    expect(usda).toMatchObject({
      ru: 'Коулслоу (салат из капусты)',
      kcal100: 159,
      protein100: 0.88,
      fat100: 11.8,
      carbs100: 12.4,
    })
    expect(usda?.cholesterolImpact).toBeUndefined()

    const search = renderHook(() =>
      useAddMealCatalog({
        locale: 'ru',
        isOnline: false,
        search: 'Салат Коул слоу',
        setSearch: () => {},
        openPickedItemSheet: () => {},
      }),
    )
    const hit = search.result.current.matches.find(
      (item) => item.source === 'food' && item.food.ru === 'Салат Коул слоу',
    )
    expect(hit?.source).toBe('food')
    if (hit?.source !== 'food') return
    expect(hit.food).toBe(salad)
    expect(hit.food).toMatchObject({
      kcal100: 95,
      protein100: 1.4,
      fat100: 7.5,
      carbs100: 6.3,
      cholesterolImpact: 'beneficial',
      cholesterolReason: salad?.cholesterolReason,
    })
  })
})
