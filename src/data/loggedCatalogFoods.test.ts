import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useAddMealCatalog } from '@/features/daily-log/useAddMealCatalog'
import {
  useCatalogFoodImportStore,
  useFoodOverrideStore,
  useMealItemStore,
  useRecipeStore,
} from '@/stores'
import { foods } from './foods'
import {
  loggedCatalogRussianReason,
  mergeLoggedCatalogFoods,
  resolveLoggedCatalogSeed,
} from './loggedCatalogFoods'
import { LOGGED_CATALOG_SEEDS } from './loggedCatalogSeeds'

const ICE = 'Мороженое Сахарная трубочка Крем-брюле'
const PATTIES = 'Биточки из индейки'
const MAASDAM = 'Сыр Маасдам'
const BONITO = 'Пеламида атлантическая'
const NUT_CAKE = 'Кекс ореховый'

function seedNamed(nameRu: string) {
  const seed = LOGGED_CATALOG_SEEDS.find((row) => row.nameRu === nameRu)
  if (!seed) throw new Error(nameRu)
  return seed
}

describe('logged catalog foods (#1017)', () => {
  it('upserts 57 foods and skips the nut cake with no saved macros', () => {
    expect(LOGGED_CATALOG_SEEDS).toHaveLength(58)
    let added = 0
    let updated = 0
    const skipped: string[] = []
    for (const seed of LOGGED_CATALOG_SEEDS) {
      const rows = foods.filter((food) => food.ru === seed.nameRu)
      expect(rows).toHaveLength(rows.length === 0 ? 0 : 1)
      const row = rows[0]
      if (!row) {
        skipped.push(seed.nameRu)
        continue
      }
      expect(row.cholesterolReason).toBe(
        loggedCatalogRussianReason(seed.cholesterolReasonRu),
      )
      expect(row.cholesterolReason).not.toMatch(/LDL/)
      if (row.id.startsWith('logged-')) added += 1
      else updated += 1
    }
    expect(skipped).toEqual([NUT_CAKE])
    expect(added).toBe(48)
    expect(updated).toBe(9)
    expect(new Set(foods.map((food) => food.id)).size).toBe(foods.length)
    expect(mergeLoggedCatalogFoods(foods)).toEqual(foods)
  })

  it('keeps an existing id and fills missing bonito carbs with 0', () => {
    expect(foods.find((food) => food.ru === 'Яйцо')).toMatchObject({
      id: 'egg',
      en: 'Egg',
      kcal100: 155.2,
      protein100: 13,
      fat100: 11,
      carbs100: 1.1,
      cholesterolImpact: 'neutral',
    })
    expect(foods.find((food) => food.ru === 'Яйцо')?.servings).toHaveLength(3)
    expect(foods.find((food) => food.ru === 'Салат Коул слоу')).toMatchObject({
      id: 'salad-coleslaw',
      kcal100: 95,
      protein100: 1.4,
      fat100: 7.5,
      carbs100: 6.3,
      cholesterolImpact: 'beneficial',
    })
    expect(
      foods.filter((food) => food.ru === 'Салат Коул слоу'),
    ).toHaveLength(1)
    expect(foods.find((food) => food.id === 'coleslaw')).toMatchObject({
      ru: 'Коулслоу (салат из капусты)',
      kcal100: 159,
    })
    expect(foods.find((food) => food.ru === BONITO)).toMatchObject({
      en: 'Atlantic bonito',
      kcal100: 250.6,
      protein100: 20,
      fat100: 19,
      carbs100: 0,
      cholesterolImpact: 'beneficial',
    })
    expect(foods.find((food) => food.ru === NUT_CAKE)).toBeUndefined()
    expect(foods.find((food) => food.ru === MAASDAM)).not.toHaveProperty(
      'brand',
    )
  })

  it('recovers missing macros from the exact name and does not invent them', () => {
    const bonito = seedNamed(BONITO)
    expect(resolveLoggedCatalogSeed(bonito, [])?.carbs100).toBe(0)
    expect(
      resolveLoggedCatalogSeed(bonito, [
        {
          ru: BONITO,
          protein100: 1,
          fat100: 1,
          carbs100: 4.5,
        },
      ])?.carbs100,
    ).toBe(4.5)

    const cake = seedNamed(NUT_CAKE)
    expect(resolveLoggedCatalogSeed(cake, [])).toBeNull()
    expect(
      resolveLoggedCatalogSeed(cake, [
        {
          ru: 'Кекс медовый',
          protein100: 6,
          fat100: 18,
          carbs100: 40,
        },
      ]),
    ).toBeNull()
    expect(
      resolveLoggedCatalogSeed(cake, [
        {
          ru: NUT_CAKE,
          protein100: 6,
          fat100: 18,
          carbs100: 1,
        },
      ]),
    ).toMatchObject({
      kcal100: 320,
      protein100: 6,
      fat100: 18,
      carbs100: 40,
      cholesterolImpact: 'unknown',
    })
    const ice = seedNamed(ICE)
    expect(
      resolveLoggedCatalogSeed(
        { ...ice, cholesterolImpact: 'not-a-level' },
        [],
      )?.cholesterolImpact,
    ).toBe('unknown')
  })

  it('meal search finds the new names with JSON macros and LDL', () => {
    useMealItemStore.setState({ items: [] })
    useRecipeStore.setState({ recipes: [] })
    useFoodOverrideStore.setState({ overrides: [] })
    useCatalogFoodImportStore.setState({
      imports: [],
      status: 'idle',
      error: null,
    })

    const expected = [
      {
        name: ICE,
        kcal100: 310,
        protein100: 4,
        fat100: 19,
        carbs100: 32,
        cholesterolImpact: 'limit',
      },
      {
        name: PATTIES,
        kcal100: 170,
        protein100: 16,
        fat100: 7.6,
        carbs100: 9.2,
        cholesterolImpact: 'moderate',
      },
      {
        name: MAASDAM,
        kcal100: 350.9,
        protein100: 26,
        fat100: 27.2,
        carbs100: 0,
        cholesterolImpact: 'limit',
      },
    ]
    for (const sample of expected) {
      const search = renderHook(() =>
        useAddMealCatalog({
          locale: 'ru',
          isOnline: false,
          search: sample.name,
          setSearch: () => {},
          openPickedItemSheet: () => {},
        }),
      )
      const hit = search.result.current.matches.find(
        (item) => item.source === 'food' && item.food.ru === sample.name,
      )
      expect(hit?.source).toBe('food')
      if (hit?.source !== 'food') continue
      expect(hit.food).toMatchObject({
        kcal100: sample.kcal100,
        protein100: sample.protein100,
        fat100: sample.fat100,
        carbs100: sample.carbs100,
        cholesterolImpact: sample.cholesterolImpact,
      })
      expect(hit.food.cholesterolReason).not.toMatch(/LDL/)
    }
  })
})
