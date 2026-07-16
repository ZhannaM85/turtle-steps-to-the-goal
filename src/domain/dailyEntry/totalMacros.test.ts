import { describe, expect, it } from 'vitest'
import type { CalorieEntry, CalorieItem } from './DailyEntry'
import { totalCarbs, totalFat, totalProtein } from './totalMacros'

function makeItem(overrides: Partial<CalorieItem> = {}): CalorieItem {
  return {
    id: crypto.randomUUID(),
    amountKcal: 500,
    ...overrides,
  }
}

function makeEntry(...items: CalorieItem[]): CalorieEntry {
  return {
    id: crypto.randomUUID(),
    items,
    createdAt: '2026-03-01T00:00:00.000Z',
  }
}

describe('totalProtein / totalFat / totalCarbs', () => {
  it('returns undefined when there are no entries', () => {
    expect(totalProtein(undefined)).toBeUndefined()
    expect(totalProtein([])).toBeUndefined()
  })

  it('returns undefined when no meal logged that macro', () => {
    expect(totalProtein([makeEntry(makeItem()), makeEntry(makeItem())])).toBeUndefined()
  })

  it('sums only the meals that logged the macro, skipping the rest', () => {
    expect(
      totalProtein([
        makeEntry(makeItem({ proteinG: 20 })),
        makeEntry(makeItem()), // no protein logged for this meal
        makeEntry(makeItem({ proteinG: 15 })),
      ]),
    ).toBe(35)
  })

  it('sums fat and carbs independently of protein', () => {
    const entries = [
      makeEntry(makeItem({ proteinG: 20, fatG: 10, carbsG: 30 })),
      makeEntry(makeItem({ fatG: 5 })),
    ]
    expect(totalProtein(entries)).toBe(20)
    expect(totalFat(entries)).toBe(15)
    expect(totalCarbs(entries)).toBe(30)
  })

  it('sums across every item within a single grouped meal, skipping items that lack it (#81)', () => {
    const entries = [
      makeEntry(
        makeItem({ proteinG: 20 }),
        makeItem(), // no protein on this item
        makeItem({ proteinG: 10 }),
      ),
    ]
    expect(totalProtein(entries)).toBe(30)
  })
})
