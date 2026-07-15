import { describe, expect, it } from 'vitest'
import type { CalorieEntry } from './DailyEntry'
import { totalCarbs, totalFat, totalProtein } from './totalMacros'

function makeEntry(overrides: Partial<CalorieEntry> = {}): CalorieEntry {
  return {
    id: crypto.randomUUID(),
    amountKcal: 500,
    createdAt: '2026-03-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('totalProtein / totalFat / totalCarbs', () => {
  it('returns undefined when there are no entries', () => {
    expect(totalProtein(undefined)).toBeUndefined()
    expect(totalProtein([])).toBeUndefined()
  })

  it('returns undefined when no meal logged that macro', () => {
    expect(totalProtein([makeEntry(), makeEntry()])).toBeUndefined()
  })

  it('sums only the meals that logged the macro, skipping the rest', () => {
    expect(
      totalProtein([
        makeEntry({ proteinG: 20 }),
        makeEntry(), // no protein logged for this meal
        makeEntry({ proteinG: 15 }),
      ]),
    ).toBe(35)
  })

  it('sums fat and carbs independently of protein', () => {
    const entries = [
      makeEntry({ proteinG: 20, fatG: 10, carbsG: 30 }),
      makeEntry({ fatG: 5 }),
    ]
    expect(totalProtein(entries)).toBe(20)
    expect(totalFat(entries)).toBe(15)
    expect(totalCarbs(entries)).toBe(30)
  })
})
