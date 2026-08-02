import { afterEach, describe, expect, it, vi } from 'vitest'
import { searchOnlineFoods } from './searchOnlineFoods'
import { searchRuFoodGenerics } from './ruFoodGenerics'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('searchRuFoodGenerics', () => {
  it('matches Russian staple names', () => {
    const hits = searchRuFoodGenerics('молоко')
    expect(hits.length).toBeGreaterThan(0)
    expect(hits[0]?.name.toLowerCase()).toContain('молоко')
    expect(hits[0]?.kcal100).toBeGreaterThan(0)
  })

  it('matches English aliases', () => {
    expect(searchRuFoodGenerics('butter').some((h) => h.kcal100 > 700)).toBe(
      true,
    )
  })
})

describe('searchOnlineFoods', () => {
  it('returns bundled staples when offline', async () => {
    const result = await searchOnlineFoods('молоко', { online: false })
    expect(result.hits.length).toBeGreaterThan(0)
    expect(result.remoteSource).toBeNull()
  })

  it('falls back to USDA when OFF is unavailable (#535)', async () => {
    const fetchMock = vi
      .fn()
      // OFF
      .mockResolvedValueOnce({ ok: false, status: 503 })
      // USDA
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          foods: [
            {
              description: 'Milk, whole',
              foodNutrients: [
                { nutrientId: 1008, value: 61 },
                { nutrientId: 1003, value: 3.2 },
                { nutrientId: 1004, value: 3.3 },
                { nutrientId: 1005, value: 4.8 },
              ],
            },
          ],
        }),
      })
    vi.stubGlobal('fetch', fetchMock)

    const result = await searchOnlineFoods('milk', { online: true })
    expect(result.remoteSource).toBe('usda')
    expect(result.remoteStatus).toBe('ok')
    expect(result.hits.some((h) => h.name === 'Milk, whole')).toBe(true)
  })

  it('prefers OFF when it returns usable hits', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          products: [
            {
              product_name: 'OFF Yogurt',
              nutriments: { 'energy-kcal_100g': 90 },
            },
          ],
        }),
      }),
    )

    const result = await searchOnlineFoods('yogurt', { online: true })
    expect(result.remoteSource).toBe('off')
    expect(result.hits.some((h) => h.name === 'OFF Yogurt')).toBe(true)
  })
})
