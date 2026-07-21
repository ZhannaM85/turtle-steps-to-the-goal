import { describe, expect, it } from 'vitest'
import type { CalorieEntry, CalorieItem, DailyEntry } from '@/domain/dailyEntry'
import { recentAverages } from './recentAverages'

function calories(
  amountKcal: number,
  macros: Partial<CalorieItem> = {},
): CalorieEntry[] {
  return [
    {
      id: crypto.randomUUID(),
      items: [{ id: crypto.randomUUID(), amountKcal, ...macros }],
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ]
}

let idCounter = 0
function entry(date: string, overrides: Partial<DailyEntry> = {}): DailyEntry {
  idCounter += 1
  const now = '2026-01-01T00:00:00.000Z'
  return {
    id: `entry-${idCounter}`,
    date,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

const TODAY = new Date('2026-03-31T12:00:00.000Z')

describe('recentAverages', () => {
  it('returns nulls for no entries', () => {
    const result = recentAverages([], 7, TODAY)
    expect(result.averageCalories).toBeNull()
    expect(result.averageProteinG).toBeNull()
  })

  it('averages calories only over days within the trailing window', () => {
    const entries = [
      entry('2026-03-31', { calorieEntries: calories(2000) }),
      entry('2026-03-25', { calorieEntries: calories(1800) }),
      // outside the 7-day window ending 2026-03-31
      entry('2026-03-01', { calorieEntries: calories(1000) }),
    ]

    const result = recentAverages(entries, 7, TODAY)

    expect(result.averageCalories).toBe(1900) // (2000 + 1800) / 2
  })

  it('includes the full 30-day window when asked, pulling in a day outside the 7-day window', () => {
    const entries = [
      entry('2026-03-31', { calorieEntries: calories(2000) }),
      entry('2026-03-15', { calorieEntries: calories(1000) }), // 16 days back
    ]

    const result = recentAverages(entries, 30, TODAY)

    expect(result.averageCalories).toBe(1500)
  })

  it('averages protein only over days that actually logged it (#53 reasoning)', () => {
    const entries = [
      entry('2026-03-31', {
        calorieEntries: calories(2000, { proteinG: 100 }),
      }),
      entry('2026-03-30', { calorieEntries: calories(1800) }), // no protein logged
    ]

    const result = recentAverages(entries, 7, TODAY)

    expect(result.averageProteinG).toBe(100)
  })

  it('is anchored to `today`, not the most recent logged entry, so a logging gap shrinks the sample', () => {
    const entries = [
      // Nothing logged in the last week; only an old entry exists.
      entry('2026-02-01', { calorieEntries: calories(1500) }),
    ]

    const result = recentAverages(entries, 7, TODAY)

    expect(result.averageCalories).toBeNull()
  })

  it('ignores days with no calorie entries at all rather than counting them as 0', () => {
    const entries = [
      entry('2026-03-31', { weightKg: 80 }), // weight only, no calories logged
      entry('2026-03-30', { calorieEntries: calories(2000) }),
    ]

    const result = recentAverages(entries, 7, TODAY)

    expect(result.averageCalories).toBe(2000)
  })
})
