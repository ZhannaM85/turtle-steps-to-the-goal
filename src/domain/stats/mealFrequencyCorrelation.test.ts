import { addDays, format } from 'date-fns'
import { describe, expect, it } from 'vitest'
import type { CalorieEntry, DailyEntry } from '@/domain/dailyEntry'
import { mealFrequencyCorrelation } from './mealFrequencyCorrelation'

const DATE_FORMAT = 'yyyy-MM-dd'
const DAY_0 = '2026-03-01'

function day(offset: number): string {
  return format(
    addDays(new Date(`${DAY_0}T00:00:00.000Z`), offset),
    DATE_FORMAT,
  )
}

function meals(count: number): CalorieEntry[] {
  return Array.from({ length: count }, () => ({
    id: crypto.randomUUID(),
    items: [{ id: crypto.randomUUID(), amountKcal: 400 }],
    createdAt: '2026-01-01T00:00:00.000Z',
  }))
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

describe('mealFrequencyCorrelation', () => {
  it('returns null with no entries', () => {
    expect(mealFrequencyCorrelation([])).toBeNull()
  })

  it('returns null with fewer than 8 comparable day-pairs', () => {
    const entries = [
      entry(day(0), { weightKg: 80, calorieEntries: meals(3) }),
      entry(day(1), { weightKg: 80.1, calorieEntries: meals(5) }),
      entry(day(2), { weightKg: 80.5 }),
    ]

    expect(mealFrequencyCorrelation(entries)).toBeNull()
  })

  it('reports the more-frequent-meals half averaging more next-day gain', () => {
    const entries = [
      entry(day(0), { weightKg: 80.0, calorieEntries: meals(3) }),
      entry(day(1), { weightKg: 80.1, calorieEntries: meals(3) }),
      entry(day(2), { weightKg: 80.2, calorieEntries: meals(3) }),
      entry(day(3), { weightKg: 80.25, calorieEntries: meals(3) }),
      entry(day(4), { weightKg: 80.4, calorieEntries: meals(5) }),
      entry(day(5), { weightKg: 81.2, calorieEntries: meals(5) }),
      entry(day(6), { weightKg: 81.9, calorieEntries: meals(5) }),
      entry(day(7), { weightKg: 82.8, calorieEntries: meals(5) }),
      entry(day(8), { weightKg: 83.4 }),
    ]

    const result = mealFrequencyCorrelation(entries)
    expect(result).not.toBeNull()
    expect(result!.dayCount).toBe(8)
    expect(result!.moreAveragedMoreGain).toBe(true)
    expect(result!.fewerGroupAvgDeltaKg).toBeCloseTo(0.1, 5)
    expect(result!.moreGroupAvgDeltaKg).toBeCloseTo(0.75, 5)
    // A 0.65kg gap between the two groups' averages clears the 0.15kg
    // "strong" daily threshold (same shape as lateMealCorrelation's own
    // strength test).
    expect(result!.strength).toBe('strong')
  })

  it('reports the fewer-meals half averaging more gain when that is what the data shows', () => {
    const entries = [
      entry(day(0), { weightKg: 80.0, calorieEntries: meals(3) }),
      entry(day(1), { weightKg: 80.8, calorieEntries: meals(3) }),
      entry(day(2), { weightKg: 81.7, calorieEntries: meals(3) }),
      entry(day(3), { weightKg: 82.5, calorieEntries: meals(3) }),
      entry(day(4), { weightKg: 82.6, calorieEntries: meals(5) }),
      entry(day(5), { weightKg: 82.65, calorieEntries: meals(5) }),
      entry(day(6), { weightKg: 82.75, calorieEntries: meals(5) }),
      entry(day(7), { weightKg: 82.8, calorieEntries: meals(5) }),
      entry(day(8), { weightKg: 82.85 }),
    ]

    const result = mealFrequencyCorrelation(entries)
    expect(result!.moreAveragedMoreGain).toBe(false)
  })

  it('ignores a day with no meals logged', () => {
    const entries = [
      entry(day(0), { weightKg: 80.0 }), // no calorieEntries at all
      entry(day(1), { weightKg: 80.5 }),
    ]

    expect(mealFrequencyCorrelation(entries)).toBeNull()
  })

  it('ignores a day whose next calendar date has no logged weight', () => {
    const entries = [
      entry(day(0), { weightKg: 80.0, calorieEntries: meals(3) }),
      // day(1) missing entirely — no next-day weight to pair with.
      entry(day(2), { weightKg: 81.0, calorieEntries: meals(3) }),
      entry(day(3), { weightKg: 81.5 }),
    ]

    expect(mealFrequencyCorrelation(entries)).toBeNull()
  })

  it('counts meal groups, not items within a meal', () => {
    // A single meal with 3 dishes still counts as 1 meal, not 3 — the
    // whole point of correlating meal *count* rather than item count.
    const entries = [
      entry(day(0), {
        weightKg: 80.0,
        calorieEntries: [
          {
            id: crypto.randomUUID(),
            items: [
              { id: crypto.randomUUID(), amountKcal: 200 },
              { id: crypto.randomUUID(), amountKcal: 150 },
              { id: crypto.randomUUID(), amountKcal: 100 },
            ],
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      }),
      entry(day(1), { weightKg: 80.1, calorieEntries: meals(3) }),
      entry(day(2), { weightKg: 80.2, calorieEntries: meals(3) }),
      entry(day(3), { weightKg: 80.25, calorieEntries: meals(3) }),
      entry(day(4), { weightKg: 80.4, calorieEntries: meals(5) }),
      entry(day(5), { weightKg: 81.2, calorieEntries: meals(5) }),
      entry(day(6), { weightKg: 81.9, calorieEntries: meals(5) }),
      entry(day(7), { weightKg: 82.8, calorieEntries: meals(5) }),
      entry(day(8), { weightKg: 83.4 }),
    ]

    const result = mealFrequencyCorrelation(entries)
    expect(result!.dayCount).toBe(8)
    expect(result!.moreAveragedMoreGain).toBe(true)
  })
})
