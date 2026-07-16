import { describe, expect, it } from 'vitest'
import type { CalorieEntry, CalorieItem } from './DailyEntry'
import { totalCalories } from './totalCalories'

function makeEntry(...items: CalorieItem[]): CalorieEntry {
  return {
    id: crypto.randomUUID(),
    items,
    createdAt: '2026-03-01T00:00:00.000Z',
  }
}

function makeItem(amountKcal: number): CalorieItem {
  return { id: crypto.randomUUID(), amountKcal }
}

describe('totalCalories', () => {
  it('returns undefined when there are no entries', () => {
    expect(totalCalories(undefined)).toBeUndefined()
    expect(totalCalories([])).toBeUndefined()
  })

  it('sums a single entry', () => {
    expect(totalCalories([makeEntry(makeItem(300))])).toBe(300)
  })

  it('sums multiple entries', () => {
    expect(
      totalCalories([
        makeEntry(makeItem(300)),
        makeEntry(makeItem(200)),
        makeEntry(makeItem(1100)),
      ]),
    ).toBe(1600)
  })

  it('sums every item within a single grouped meal (#81)', () => {
    expect(
      totalCalories([makeEntry(makeItem(300), makeItem(150), makeItem(50))]),
    ).toBe(500)
  })
})
