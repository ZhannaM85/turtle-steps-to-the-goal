import { describe, expect, it } from 'vitest'
import type { CalorieEntry, CalorieItem, DailyEntry } from '@/domain/dailyEntry'
import { dateRangeSummary } from './dateRangeSummary'

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

describe('dateRangeSummary', () => {
  it('returns nulls and a zero day count for an empty range', () => {
    const summary = dateRangeSummary([], '2026-03-01', '2026-03-31')

    expect(summary.averageWeightKg).toBeNull()
    expect(summary.averageCalories).toBeNull()
    expect(summary.loggedDayCount).toBe(0)
  })

  it('averages only entries within the inclusive [startDate, endDate] range', () => {
    const entries = [
      entry('2026-02-28', { weightKg: 90 }), // before range
      entry('2026-03-01', { weightKg: 80 }), // range start, inclusive
      entry('2026-03-15', { weightKg: 82 }),
      entry('2026-03-31', { weightKg: 84 }), // range end, inclusive
      entry('2026-04-01', { weightKg: 100 }), // after range
    ]

    const summary = dateRangeSummary(entries, '2026-03-01', '2026-03-31')

    expect(summary.averageWeightKg).toBe(82) // (80 + 82 + 84) / 3
    expect(summary.loggedDayCount).toBe(3)
  })

  it('averages macros only over the days that logged each one (#53 reasoning)', () => {
    const entries = [
      entry('2026-03-01', {
        calorieEntries: calories(1900, { proteinG: 100, fatG: 60 }),
      }),
      entry('2026-03-02', {
        calorieEntries: calories(1800, { proteinG: 80 }),
      }),
    ]

    const summary = dateRangeSummary(entries, '2026-03-01', '2026-03-31')

    expect(summary.averageCalories).toBe(1850)
    expect(summary.averageProteinG).toBe(90) // (100 + 80) / 2
    expect(summary.averageFatG).toBe(60) // only one day logged fat
    expect(summary.averageCarbsG).toBeNull() // never logged
  })

  it('counts a logged day even if it only has a note, not weight/calories', () => {
    const entries = [entry('2026-03-01', { note: 'felt good' })]

    const summary = dateRangeSummary(entries, '2026-03-01', '2026-03-31')

    expect(summary.loggedDayCount).toBe(1)
    expect(summary.averageWeightKg).toBeNull()
  })
})
