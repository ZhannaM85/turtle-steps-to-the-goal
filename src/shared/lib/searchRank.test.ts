import { describe, expect, it } from 'vitest'
import { rankBySearchMatch } from './searchRank'

describe('rankBySearchMatch', () => {
  it('ranks an exact match above a whole-word match, above a mid-word match', () => {
    const items = ['сырой омлет', 'сыр', 'мягкий сыр творожный']
    const ranked = rankBySearchMatch(items, 'сыр', (s) => s)

    expect(ranked).toEqual(['сыр', 'мягкий сыр творожный', 'сырой омлет'])
  })

  it('keeps original relative order for items of the same rank (stable sort)', () => {
    const items = ['яблочный пирог', 'яблочное пюре']
    const ranked = rankBySearchMatch(items, 'ябло', (s) => s)

    expect(ranked).toEqual(['яблочный пирог', 'яблочное пюре'])
  })

  it('is case-insensitive against the already-lowercased query', () => {
    const items = ['Cheese Toast', 'Cheesy']
    const ranked = rankBySearchMatch(items, 'cheese', (s) => s)

    expect(ranked).toEqual(['Cheese Toast', 'Cheesy'])
  })

  it('treats a query matching one word of a multi-word phrase as a whole-word match', () => {
    const items = ['cheeseburger', 'grilled cheese sandwich']
    const ranked = rankBySearchMatch(items, 'cheese', (s) => s)

    expect(ranked).toEqual(['grilled cheese sandwich', 'cheeseburger'])
  })
})
