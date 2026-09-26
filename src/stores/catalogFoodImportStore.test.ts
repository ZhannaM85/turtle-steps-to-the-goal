import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { foods } from '@/data/foods'
import { mergeCatalogFoodImports } from '@/domain/catalogFoodImport'
import { db } from '@/infrastructure/persistence/indexeddb'
import { useCatalogFoodImportStore } from './catalogFoodImportStore'

beforeEach(async () => {
  await db.catalogFoodImports.clear()
  useCatalogFoodImportStore.setState({
    imports: [],
    status: 'idle',
    error: null,
  })
})

afterEach(async () => {
  await db.catalogFoodImports.clear()
})

describe('useCatalogFoodImportStore (#1015)', () => {
  it('stores LDL on an existing catalog name without a second row', async () => {
    const oats = foods.find((food) => food.ru === 'Овсянка')
    expect(oats).toBeDefined()

    const first = await useCatalogFoodImportStore.getState().importFoods([
      {
        nameRu: 'овсянка',
        kcal100: 80,
        protein100: 2.5,
        fat100: 1.5,
        carbs100: 12,
        cholesterolImpact: 'limit',
        cholesterolReason: 'Новая причина.',
        cholesterolReasonEn: 'New reason.',
      },
    ])
    const again = await useCatalogFoodImportStore.getState().importFoods([
      {
        nameRu: 'Овсянка',
        kcal100: 80,
        protein100: 2.5,
        fat100: 1.5,
        carbs100: 12,
        cholesterolImpact: 'limit',
        cholesterolReason: 'Новая причина.',
      },
    ])

    expect(first).toEqual({ added: 1, updated: 0 })
    expect(again).toEqual({ added: 0, updated: 1 })
    expect(await db.catalogFoodImports.count()).toBe(1)
    const merged = mergeCatalogFoodImports(
      foods,
      useCatalogFoodImportStore.getState().imports,
    )
    const rows = merged.filter((food) => food.ru === 'Овсянка')
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      id: oats?.id,
      kcal100: 80,
      cholesterolImpact: 'limit',
      cholesterolReason: 'Новая причина.',
    })
    expect(merged).toHaveLength(foods.length)
  })
})
