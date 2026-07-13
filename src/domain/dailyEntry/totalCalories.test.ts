import { describe, expect, it } from 'vitest'
import type { CalorieEntry } from './DailyEntry'
import { totalCalories } from './totalCalories'

function makeEntry(amountKcal: number): CalorieEntry {
  return {
    id: crypto.randomUUID(),
    amountKcal,
    createdAt: '2026-03-01T00:00:00.000Z',
  }
}

describe('totalCalories', () => {
  it('returns undefined when there are no entries', () => {
    expect(totalCalories(undefined)).toBeUndefined()
    expect(totalCalories([])).toBeUndefined()
  })

  it('sums a single entry', () => {
    expect(totalCalories([makeEntry(300)])).toBe(300)
  })

  it('sums multiple entries', () => {
    expect(
      totalCalories([makeEntry(300), makeEntry(200), makeEntry(1100)]),
    ).toBe(1600)
  })
})
