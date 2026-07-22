import { afterEach, describe, expect, it, vi } from 'vitest'
import type { MealItem, MealItemRepository } from '@/domain/mealItem'
import { lookupBarcode } from './lookupBarcode'

function makeMealItem(overrides: Partial<MealItem> = {}): MealItem {
  const now = '2026-01-01T00:00:00.000Z'
  return {
    id: 'item-1',
    name: 'Pizza',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function fakeRepository(found: MealItem | undefined): MealItemRepository {
  return {
    getAll: vi.fn(),
    findByName: vi.fn(),
    findByBarcode: vi.fn().mockResolvedValue(found),
    upsert: vi.fn(),
    delete: vi.fn(),
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('lookupBarcode', () => {
  it('returns the local item without ever calling fetch, when one already matches', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const item = makeMealItem({ barcode: '0123456789012' })

    const result = await lookupBarcode(
      '0123456789012',
      fakeRepository(item),
      true,
    )

    expect(result).toEqual({ source: 'local', item })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('skips the fetch entirely while offline, with no local match', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const result = await lookupBarcode(
      '0123456789012',
      fakeRepository(undefined),
      false,
    )

    expect(result).toEqual({ source: 'none' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('prefills from a well-formed Open Food Facts response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 1,
          product: {
            product_name: 'Chocolate Bar',
            brands: 'Acme,Other Brand',
            nutriments: {
              'energy-kcal_100g': 520,
              proteins_100g: 6,
              fat_100g: 30,
              carbohydrates_100g: 55,
            },
          },
        }),
      }),
    )

    const result = await lookupBarcode(
      '0123456789012',
      fakeRepository(undefined),
      true,
    )

    expect(result).toEqual({
      source: 'openFoodFacts',
      name: 'Chocolate Bar',
      brand: 'Acme',
      kcal100: 520,
      protein100: 6,
      fat100: 30,
      carbs100: 55,
    })
  })

  it('falls back to none when Open Food Facts has no match (status 0)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 0 }),
      }),
    )

    const result = await lookupBarcode(
      '0123456789012',
      fakeRepository(undefined),
      true,
    )

    expect(result).toEqual({ source: 'none' })
  })

  it('falls back to none when the product has no name (defensive parsing)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 1,
          product: { nutriments: { 'energy-kcal_100g': 100 } },
        }),
      }),
    )

    const result = await lookupBarcode(
      '0123456789012',
      fakeRepository(undefined),
      true,
    )

    expect(result).toEqual({ source: 'none' })
  })

  it('falls back to none when the product has no kcal figure (defensive parsing)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 1,
          product: { product_name: 'Mystery Item' },
        }),
      }),
    )

    const result = await lookupBarcode(
      '0123456789012',
      fakeRepository(undefined),
      true,
    )

    expect(result).toEqual({ source: 'none' })
  })

  it('treats a missing brand as undefined, not an empty string', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 1,
          product: {
            product_name: 'Plain Item',
            nutriments: { 'energy-kcal_100g': 100 },
          },
        }),
      }),
    )

    const result = await lookupBarcode(
      '0123456789012',
      fakeRepository(undefined),
      true,
    )

    expect(result).toEqual({
      source: 'openFoodFacts',
      name: 'Plain Item',
      brand: undefined,
      kcal100: 100,
      protein100: undefined,
      fat100: undefined,
      carbs100: undefined,
    })
  })

  it('falls back to none when fetch throws (network failure/timeout)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('network error')),
    )

    const result = await lookupBarcode(
      '0123456789012',
      fakeRepository(undefined),
      true,
    )

    expect(result).toEqual({ source: 'none' })
  })

  it('falls back to none when the response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))

    const result = await lookupBarcode(
      '0123456789012',
      fakeRepository(undefined),
      true,
    )

    expect(result).toEqual({ source: 'none' })
  })
})
