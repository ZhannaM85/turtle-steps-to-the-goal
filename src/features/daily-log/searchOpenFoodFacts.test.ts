import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  OFF_SEARCH_MIN_CHARS,
  OFF_SEARCH_PAGE_SIZE,
  searchOpenFoodFacts,
} from './searchOpenFoodFacts'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('searchOpenFoodFacts', () => {
  it('returns [] without fetching when the query is too short', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    expect(await searchOpenFoodFacts('a')).toEqual([])
    expect(OFF_SEARCH_MIN_CHARS).toBe(2)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('requests a capped page and maps usable products only', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        products: [
          {
            code: '1',
            product_name: 'Good yogurt',
            brands: 'Brand',
            nutriments: { 'energy-kcal_100g': 80, proteins_100g: 4 },
          },
          {
            // no kcal — skipped
            product_name: 'Mystery',
            nutriments: { proteins_100g: 1 },
          },
          {
            product_name: '  ',
            nutriments: { 'energy-kcal_100g': 10 },
          },
        ],
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const hits = await searchOpenFoodFacts('yogurt')
    expect(hits).toHaveLength(1)
    expect(hits[0]).toMatchObject({
      name: 'Good yogurt',
      brand: 'Brand',
      kcal100: 80,
      protein100: 4,
    })

    const url = String(fetchMock.mock.calls[0][0])
    expect(url).toContain('search_terms=yogurt')
    expect(url).toContain(`page_size=${OFF_SEARCH_PAGE_SIZE}`)
    expect(url).toContain('fields=')
  })

  it('returns [] on network failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('offline')),
    )
    expect(await searchOpenFoodFacts('milk')).toEqual([])
  })
})
