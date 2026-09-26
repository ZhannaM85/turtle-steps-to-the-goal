import 'fake-indexeddb/auto'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useCatalogFoodImportStore, useLdlImpactStore } from '@/stores'
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
