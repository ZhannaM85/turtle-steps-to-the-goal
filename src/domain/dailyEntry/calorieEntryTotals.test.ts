import { describe, expect, it } from 'vitest'
import {
  calorieEntryCarbs,
  calorieEntryFat,
  calorieEntryKcal,
  calorieEntryProtein,
} from './calorieEntryTotals'
import type { CalorieEntry, CalorieItem } from './DailyEntry'

function makeItem(overrides: Partial<CalorieItem> = {}): CalorieItem {
  return { id: crypto.randomUUID(), amountKcal: 100, ...overrides }
}

function makeEntry(...items: CalorieItem[]): CalorieEntry {
  return { id: crypto.randomUUID(), items, createdAt: '2026-03-01T00:00:00.000Z' }
}

describe('calorieEntryKcal', () => {
  it('sums a single item', () => {
    expect(calorieEntryKcal(makeEntry(makeItem({ amountKcal: 255 })))).toBe(255)
  })

  it('sums multiple items in the same group', () => {
    expect(
      calorieEntryKcal(
        makeEntry(
          makeItem({ amountKcal: 200 }),
          makeItem({ amountKcal: 150 }),
          makeItem({ amountKcal: 50 }),
        ),
      ),
    ).toBe(400)
  })
})

describe('calorieEntryProtein / Fat / Carbs', () => {
  it('returns undefined when no item logged that macro', () => {
    expect(calorieEntryProtein(makeEntry(makeItem(), makeItem()))).toBeUndefined()
  })

  it('sums only items that logged the macro, skipping the rest', () => {
    const entry = makeEntry(
      makeItem({ proteinG: 20 }),
      makeItem(),
      makeItem({ proteinG: 5 }),
    )
    expect(calorieEntryProtein(entry)).toBe(25)
  })

  it('sums fat and carbs independently of protein', () => {
    const entry = makeEntry(
      makeItem({ proteinG: 20, fatG: 10, carbsG: 30 }),
      makeItem({ fatG: 5 }),
    )
    expect(calorieEntryProtein(entry)).toBe(20)
    expect(calorieEntryFat(entry)).toBe(15)
    expect(calorieEntryCarbs(entry)).toBe(30)
  })
})
