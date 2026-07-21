import { describe, expect, it, vi } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import { loggingConsistencyWeeks } from './loggingConsistency'

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

describe('loggingConsistencyWeeks', () => {
  it('returns an empty array for no entries', () => {
    expect(loggingConsistencyWeeks([])).toEqual([])
  })

  it('returns weeks spanning from the earliest entry through today', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-03-15T12:00:00.000Z'))
    const entries = [entry('2026-03-02', { weightKg: 80 })] // a Monday

    const weeks = loggingConsistencyWeeks(entries, 1)

    expect(weeks[0].weekStart).toBe('2026-03-02')
    expect(weeks[weeks.length - 1].days).toHaveLength(7)
    // 2026-03-15 falls in the second week (Mar 2-8, Mar 9-15).
    expect(weeks).toHaveLength(2)
    vi.useRealTimers()
  })

  it('scores a day 0-4 by how many core signals were logged', () => {
    const entries = [
      entry('2026-03-02', {
        weightKg: 80,
        calorieEntries: [
          {
            id: 'c1',
            items: [{ id: 'i1', amountKcal: 500 }],
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        sleepHours: 7,
        steps: 5000,
      }),
      entry('2026-03-03', { weightKg: 79.5 }),
      entry('2026-03-04', {}),
    ]

    const [week] = loggingConsistencyWeeks(entries, 1)

    expect(week.days[0].intensity).toBe(4) // Monday 2026-03-02
    expect(week.days[1].intensity).toBe(1) // Tuesday 2026-03-03
    expect(week.days[2].intensity).toBe(0) // Wednesday 2026-03-04 — entry exists but empty
    expect(week.days[3].intensity).toBe(0) // Thursday — no entry at all
  })

  it('does not count an empty calorieEntries array as a logged meal', () => {
    const entries = [entry('2026-03-02', { calorieEntries: [] })]

    const [week] = loggingConsistencyWeeks(entries, 1)

    expect(week.days[0].intensity).toBe(0)
  })

  it('respects the weekStartsOn parameter', () => {
    const entries = [entry('2026-03-02', { weightKg: 80 })] // a Monday

    const sundayFirst = loggingConsistencyWeeks(entries, 0)

    // With Sunday-start, 2026-03-02 (Monday) falls mid-week, so the week
    // begins on 2026-03-01.
    expect(sundayFirst[0].weekStart).toBe('2026-03-01')
  })
})
