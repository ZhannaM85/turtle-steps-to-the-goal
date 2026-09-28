import 'fake-indexeddb/auto'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import type { MealItem } from '@/domain/mealItem'
import {
  useCatalogFoodImportStore,
  useLdlImpactStore,
  useMealItemStore,
} from '@/stores'
import { db } from '@/infrastructure/persistence/indexeddb'
import { useAddMealCatalog } from './useAddMealCatalog'

const draft = {
  nameRu: 'Тестовый авокадо',
  nameEn: 'Test avocado',
  kcal100: 160,
  protein100: 2,
  fat100: 15,
  carbs100: 9,
  cholesterolImpact: 'beneficial' as const,
  cholesterolReason: 'Полезно для ЛПНП.',
}

beforeEach(async () => {
  await db.catalogFoodImports.clear()
  useCatalogFoodImportStore.setState({
    imports: [],
    status: 'idle',
    error: null,
  })
  useLdlImpactStore.setState({ enabled: false })
})

function search(locale: 'en' | 'ru', query: string) {
  return renderHook(() =>
    useAddMealCatalog({
      locale,
      isOnline: false,
      search: query,
      setSearch: () => {},
      openPickedItemSheet: () => {},
    }),
  )
}

function recentName(item: {
  source: string
  mealItem?: { name: string }
  food?: { ru: string }
}): string {
  if (item.source === 'mealItem') return item.mealItem?.name ?? ''
  return item.food?.ru ?? ''
}

const cutlets: MealItem = {
  id: 'cutlets',
  name: 'Куриные котлеты жареные',
  createdAt: '2026-09-26T12:00:00.000Z',
  updatedAt: '2026-09-26T12:00:00.000Z',
  lastAmountKcal: 153,
  lastProteinG: 17,
  lastFatG: 6,
  lastCarbsG: 6,
}

describe('imported catalog foods in meal Recent (#1035)', () => {
  it('lists a paste batch above older diary foods without a meal save', async () => {
    useMealItemStore.setState({ items: [cutlets], status: 'ready' })
    await useCatalogFoodImportStore.getState().importFoods([
      {
        nameRu: 'Лосось/форель на гриле',
        kcal100: 180,
        protein100: 22,
        fat100: 10,
        carbs100: 0,
        cholesterolImpact: 'beneficial',
      },
      {
        nameRu: 'Стручковая фасоль',
        kcal100: 35,
        protein100: 2,
        fat100: 0,
        carbs100: 7,
        cholesterolImpact: 'beneficial',
      },
      {
        nameRu: 'Белый соус с зеленью',
        kcal100: 90,
        protein100: 1,
        fat100: 8,
        carbs100: 3,
        cholesterolImpact: 'neutral',
      },
      {
        nameRu: 'Масло для приготовления',
        kcal100: 884,
        protein100: 0,
        fat100: 100,
        carbs100: 0,
        cholesterolImpact: 'limit',
      },
      {
        nameRu: 'Лимон',
        kcal100: 29,
        protein100: 1,
        fat100: 0,
        carbs100: 9,
        cholesterolImpact: 'beneficial',
      },
    ])

    const { result } = search('ru', '')
    expect(result.current.recentItems.map(recentName)).toEqual([
      'Лимон',
      'Масло для приготовления',
      'Белый соус с зеленью',
    ])
    expect(result.current.recentPoolCount).toBe(6)
    expect(result.current.matches).toEqual([])

    act(() => result.current.setShowAllRecent(true))
    expect(result.current.recentItems.map(recentName)).toEqual([
      'Лимон',
      'Масло для приготовления',
      'Белый соус с зеленью',
      'Стручковая фасоль',
      'Лосось/форель на гриле',
      'Куриные котлеты жареные',
    ])
    expect(result.current.recentItems[0]?.source).toBe('food')
    expect(result.current.recentItems[5]?.source).toBe('mealItem')

    const pastedAt =
      useCatalogFoodImportStore
        .getState()
        .imports.find((row) => row.nameRu === 'Лимон')?.updatedAt ?? ''
    expect(pastedAt).not.toBe('')
    // The paste is stamped with the clock. A fixed 2026-09-27 log is no
    // longer later than that stamp, so the catalog row would stay on top.
    const loggedAt = new Date(Date.parse(pastedAt) + 1000).toISOString()
    act(() => {
      useMealItemStore.setState({
        items: [
          cutlets,
          {
            id: 'lemon-log',
            name: 'Лимон',
            createdAt: loggedAt,
            updatedAt: loggedAt,
            lastAmountKcal: 12,
          },
        ],
      })
    })
    const shown = result.current.recentItems.map(recentName)
    expect(shown[0]).toBe('Лимон')
    expect(result.current.recentItems[0]?.source).toBe('mealItem')
    expect(shown.filter((name) => name === 'Лимон')).toHaveLength(1)
  })
})

describe('imported catalog foods in meal search (#1015)', () => {
  it('finds a pasted food by Russian or English name and keeps LDL while the toggle is off', async () => {
    await useCatalogFoodImportStore.getState().importFoods([draft])
    useCatalogFoodImportStore.setState({ imports: [], status: 'idle' })
    await useCatalogFoodImportStore.getState().load()

    const byRussian = search('en', 'Тестовый авокадо')
    const ruHit = byRussian.result.current.matches.find(
      (item) => item.source === 'food' && item.food.ru === 'Тестовый авокадо',
    )
    expect(ruHit?.source).toBe('food')
    if (ruHit?.source !== 'food') return
    expect(ruHit.food).toMatchObject({
      en: 'Test avocado',
      kcal100: 160,
      cholesterolImpact: 'beneficial',
      cholesterolReason: 'Полезно для ЛПНП.',
    })
    expect(useLdlImpactStore.getState().enabled).toBe(false)

    const byEnglish = search('ru', 'Test avocado')
    await waitFor(() => {
      expect(
        byEnglish.result.current.matches.some(
          (item) => item.source === 'food' && item.food.kcal100 === 160,
        ),
      ).toBe(true)
    })
  })
})
