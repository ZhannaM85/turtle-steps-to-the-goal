import { describe, expect, it } from 'vitest'
import { sortMealLibraryItems } from './sortMealLibraryItems'

const items = [
  { name: 'Salad', createdAt: '2026-08-01T00:00:00.000Z' },
  { name: 'Pizza', createdAt: '2026-08-10T00:00:00.000Z' },
  { name: 'Apple', createdAt: '2026-08-05T00:00:00.000Z' },
]

describe('sortMealLibraryItems (#684)', () => {
  it('sorts by title A→Z', () => {
    expect(
      sortMealLibraryItems(items, 'title-asc', 'en').map((item) => item.name),
    ).toEqual(['Apple', 'Pizza', 'Salad'])
  })

  it('sorts by title Z→A', () => {
    expect(
      sortMealLibraryItems(items, 'title-desc', 'en').map((item) => item.name),
    ).toEqual(['Salad', 'Pizza', 'Apple'])
  })

  it('sorts by date added newest→oldest', () => {
    expect(
      sortMealLibraryItems(items, 'added-newest', 'en').map(
        (item) => item.name,
      ),
    ).toEqual(['Pizza', 'Apple', 'Salad'])
  })

  it('sorts by date added oldest→newest', () => {
    expect(
      sortMealLibraryItems(items, 'added-oldest', 'en').map(
        (item) => item.name,
      ),
    ).toEqual(['Salad', 'Apple', 'Pizza'])
  })
})
