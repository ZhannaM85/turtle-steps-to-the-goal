import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { foods } from '@/data/foods'
import { mergeCatalogFoodImports } from '@/domain/catalogFoodImport'
import { db } from '@/infrastructure/persistence/indexeddb'
import { useCatalogFoodImportStore } from './catalogFoodImportStore'
import { useDailyEntryStore } from './dailyEntryStore'

beforeEach(async () => {
  await db.catalogFoodImports.clear()
  await db.dailyEntries.clear()
  useCatalogFoodImportStore.setState({
    imports: [],
    status: 'idle',
    error: null,
  })
  useDailyEntryStore.setState({
    date: null,
    entry: null,
    status: 'idle',
    error: null,
  })
})

afterEach(async () => {
  await db.catalogFoodImports.clear()
  await db.dailyEntries.clear()
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

  it('restamps a matching diary meal when LDL changes (#1020)', async () => {
    const appleDay = {
      id: 'day-apple',
      date: '2026-09-26',
      createdAt: '2026-09-26T00:00:00.000Z',
      updatedAt: '2026-09-26T00:00:00.000Z',
      calorieEntries: [
        {
          id: 'meal-1',
          createdAt: '2026-09-26T08:00:00.000Z',
          items: [
            {
              id: 'apple',
              name: 'Яблоко',
              amountKcal: 104,
              proteinG: 1,
              fatG: 0,
              carbsG: 28,
              amountG: 200,
              cholesterolImpact: 'unknown' as const,
            },
          ],
        },
      ],
    }
    const carrotDay = {
      id: 'day-carrot',
      date: '2026-09-01',
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
      calorieEntries: [
        {
          id: 'meal-2',
          createdAt: '2026-09-01T08:00:00.000Z',
          items: [
            {
              id: 'carrot',
              name: 'Морковь',
              amountKcal: 14,
              amountG: 35,
              cholesterolImpact: 'beneficial' as const,
            },
          ],
        },
      ],
    }
    await db.dailyEntries.bulkPut([appleDay, carrotDay])
    useDailyEntryStore.setState({
      entry: appleDay,
      date: appleDay.date,
      status: 'ready',
    })

    await useCatalogFoodImportStore.getState().importFoods([
      {
        nameRu: 'Яблоко',
        nameEn: 'Apple',
        aliases: ['яблоко', 'яблоки', 'apple', 'apples'],
        kcal100: 52,
        protein100: 0.3,
        fat100: 0.2,
        carbs100: 13.8,
        cholesterolImpact: 'beneficial',
        cholesterolReason: 'Пектин.',
      },
    ])

    const saved = await db.dailyEntries.get('day-apple')
    expect(saved?.calorieEntries?.[0]?.items[0]).toMatchObject({
      name: 'Яблоко',
      amountKcal: 104,
      proteinG: 1,
      fatG: 0,
      carbsG: 28,
      amountG: 200,
      cholesterolImpact: 'beneficial',
      cholesterolReason: 'Пектин.',
    })
    expect(useDailyEntryStore.getState().entry?.calorieEntries?.[0]?.items[0]).toMatchObject({
      cholesterolImpact: 'beneficial',
    })
    const carrot = await db.dailyEntries.get('day-carrot')
    expect(carrot?.updatedAt).toBe(carrotDay.updatedAt)
    expect(carrot?.calorieEntries?.[0]?.items[0]).toMatchObject({
      name: 'Морковь',
      amountKcal: 14,
      cholesterolImpact: 'beneficial',
    })

    await useCatalogFoodImportStore.getState().importFoods([
      {
        nameRu: 'Яблоко',
        kcal100: 52,
        protein100: 0.3,
        fat100: 0.2,
        carbs100: 13.8,
        cholesterolImpact: 'beneficial',
        cholesterolReason: 'Пектин.',
      },
    ])
    expect((await db.dailyEntries.get('day-carrot'))?.updatedAt).toBe(
      carrotDay.updatedAt,
    )
    expect((await db.dailyEntries.get('day-apple'))?.calorieEntries?.[0]?.items[0]?.amountKcal).toBe(104)
  })
})
