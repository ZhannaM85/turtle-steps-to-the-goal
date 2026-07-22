import { describe, expect, it } from 'vitest'
import type { CalorieEntry, DailyEntry } from '@/domain/dailyEntry'
import type { LoggingConsistencyWeek } from './loggingConsistency'
import { loggingConsistencySummary } from './loggingConsistencySummary'

function calories(amountKcal: number): CalorieEntry[] {
  return [
    {
      id: crypto.randomUUID(),
      items: [{ id: crypto.randomUUID(), amountKcal }],
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

function week(weekStart: string, days: { date: string; intensity: number }[]): LoggingConsistencyWeek {
  return { weekStart, days }
}

const TODAY = new Date('2026-03-31T12:00:00.000Z')

describe('loggingConsistencySummary', () => {
  it('returns zero days logged and null totals for no weeks/entries', () => {
    const result = loggingConsistencySummary([], [], TODAY)

    expect(result.daysLoggedCount).toBe(0)
    expect(result.totalCaloriesOverLoggedDays).toBeNull()
    expect(result.totalCaloriesLast7Days).toBeNull()
  })

  it('counts days with intensity > 0 across the given weeks, ignoring intensity-0 days', () => {
    const weeks = [
      week('2026-03-02', [
        { date: '2026-03-02', intensity: 4 },
        { date: '2026-03-03', intensity: 1 },
        { date: '2026-03-04', intensity: 0 },
      ]),
    ]

    const result = loggingConsistencySummary([], weeks, TODAY)

    expect(result.daysLoggedCount).toBe(2)
  })

  it('sums calories only across days within the given weeks that have a calorie entry', () => {
    const weeks = [
      week('2026-03-02', [
        { date: '2026-03-02', intensity: 2 },
        { date: '2026-03-03', intensity: 1 },
        { date: '2026-03-04', intensity: 0 },
      ]),
    ]
    const entries = [
      entry('2026-03-02', { calorieEntries: calories(1800) }),
      entry('2026-03-03', { weightKg: 80 }), // logged, but no calories
      // 2026-03-10 is outside the given weeks — must not be counted
      entry('2026-03-10', { calorieEntries: calories(9999) }),
    ]

    const result = loggingConsistencySummary(entries, weeks, TODAY)

    expect(result.totalCaloriesOverLoggedDays).toBe(1800)
  })

  it('sums calories over a fixed trailing 7 days, independent of the given weeks', () => {
    const entries = [
      entry('2026-03-31', { calorieEntries: calories(2000) }),
      entry('2026-03-28', { calorieEntries: calories(1500) }),
      // outside the 7-day window ending 2026-03-31
      entry('2026-03-01', { calorieEntries: calories(1000) }),
    ]

    const result = loggingConsistencySummary(entries, [], TODAY)

    expect(result.totalCaloriesLast7Days).toBe(3500)
  })
})
