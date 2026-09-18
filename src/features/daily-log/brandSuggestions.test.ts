import { describe, expect, it } from 'vitest'
import {
  brandOccurrencesFromDailyEntries,
  brandOccurrencesFromMealItems,
  filterBrandSuggestions,
  uniqueBrandsRanked,
} from './brandSuggestions'

describe('uniqueBrandsRanked (#969)', () => {
  it('dedupes case-insensitively and keeps the most recent spelling', () => {
    expect(
      uniqueBrandsRanked([
        { brand: 'perdue', usedAt: '2026-01-01T00:00:00.000Z' },
        { brand: '  Perdue  ', usedAt: '2026-02-01T00:00:00.000Z' },
        { brand: 'PERDUE', usedAt: '2026-01-15T00:00:00.000Z' },
      ]),
    ).toEqual(['Perdue'])
  })

  it('skips blank and whitespace-only brands', () => {
    expect(
      uniqueBrandsRanked([
        { brand: '   ', usedAt: '2026-02-01T00:00:00.000Z' },
        { brand: '', usedAt: '2026-02-02T00:00:00.000Z' },
        { brand: 'Danone', usedAt: '2026-01-01T00:00:00.000Z' },
      ]),
    ).toEqual(['Danone'])
  })

  it('ranks the most recently used brand first', () => {
    expect(
      uniqueBrandsRanked([
        { brand: 'Older', usedAt: '2026-01-01T00:00:00.000Z' },
        { brand: 'Newest', usedAt: '2026-03-01T00:00:00.000Z' },
        { brand: 'Middle', usedAt: '2026-02-01T00:00:00.000Z' },
      ]),
    ).toEqual(['Newest', 'Middle', 'Older'])
  })

  it('breaks recency ties by frequency, then name', () => {
    expect(
      uniqueBrandsRanked([
        { brand: 'Zed', usedAt: '2026-02-01T00:00:00.000Z' },
        { brand: 'Amy', usedAt: '2026-02-01T00:00:00.000Z' },
        { brand: 'Zed', usedAt: '2026-02-01T00:00:00.000Z' },
      ]),
    ).toEqual(['Zed', 'Amy'])
  })
})

describe('filterBrandSuggestions (#969)', () => {
  const brands = ['Perdue', 'Danone', 'Перекресток']

  it('filters case-insensitively as the user types', () => {
    expect(filterBrandSuggestions(brands, 'PER')).toEqual(['Perdue'])
    expect(filterBrandSuggestions(brands, 'дано')).toEqual([])
    expect(filterBrandSuggestions(brands, 'пере')).toEqual(['Перекресток'])
  })

  it('trims the query before matching', () => {
    expect(filterBrandSuggestions(brands, '  dan  ')).toEqual(['Danone'])
  })

  it('returns every ranked brand when the query is empty or whitespace', () => {
    expect(filterBrandSuggestions(brands, '')).toEqual(brands)
    expect(filterBrandSuggestions(brands, '   ')).toEqual(brands)
  })

  it('returns an empty list when nothing matches, without erroring', () => {
    expect(filterBrandSuggestions(brands, 'xyz')).toEqual([])
  })

  it('ranks an exact match above a looser substring match', () => {
    expect(
      filterBrandSuggestions(['Siggis Dairy', 'Siggis'], 'siggis'),
    ).toEqual(['Siggis', 'Siggis Dairy'])
  })
})

describe('brand occurrence collectors (#969)', () => {
  it('reads trimmed brands from the dish library', () => {
    expect(
      brandOccurrencesFromMealItems([
        { brand: ' Perdue ', updatedAt: '2026-02-01T00:00:00.000Z' },
        { updatedAt: '2026-03-01T00:00:00.000Z' },
        { brand: '  ', updatedAt: '2026-04-01T00:00:00.000Z' },
      ]),
    ).toEqual([{ brand: 'Perdue', usedAt: '2026-02-01T00:00:00.000Z' }])
  })

  it('reads brands from meal history, using meal time when present', () => {
    expect(
      brandOccurrencesFromDailyEntries([
        {
          date: '2026-01-10',
          calorieEntries: [
            {
              createdAt: '2026-01-10T08:00:00.000Z',
              items: [{ brand: 'Quaker' }, {}],
            },
            {
              items: [{ brand: ' Danone ' }],
            },
          ],
        },
      ]),
    ).toEqual([
      { brand: 'Quaker', usedAt: '2026-01-10T08:00:00.000Z' },
      { brand: 'Danone', usedAt: '2026-01-10' },
    ])
  })
})
