import { describe, expect, it } from 'vitest'
import type { CalorieEntry, CalorieItem, DailyEntry } from '@/domain/dailyEntry'
import { monthlySummaries } from './monthlySummaries'

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

describe('monthlySummaries', () => {
  it('returns an empty array for no entries', () => {
    expect(monthlySummaries([])).toEqual([])
  })

  it('handles a single month with a single data point (no prior month to compare)', () => {
    const entries = [entry('2026-03-05', { weightKg: 80 })]

    const [summary] = monthlySummaries(entries)

    expect(summary.monthStart).toBe('2026-03-01')
    expect(summary.monthEnd).toBe('2026-03-31')
    expect(summary.averageWeightKg).toBe(80)
    expect(summary.deltaVsPriorMonthKg).toBeNull()
  })

  it('averages only the days that were actually logged within the month', () => {
    const entries = [
      entry('2026-03-01', { weightKg: 80 }),
      // most of the month not logged
      entry('2026-03-31', { weightKg: 82 }),
    ]

    const [summary] = monthlySummaries(entries)

    expect(summary.averageWeightKg).toBe(81)
  })

  it('computes delta across two consecutive months', () => {
    const entries = [
      entry('2026-03-05', { weightKg: 80 }),
      entry('2026-03-15', { weightKg: 82 }),
      entry('2026-04-05', { weightKg: 79 }),
      entry('2026-04-15', { weightKg: 77 }),
    ]

    const [march, april] = monthlySummaries(entries)

    expect(march.averageWeightKg).toBe(81)
    expect(april.averageWeightKg).toBe(78)
    expect(april.deltaVsPriorMonthKg).toBe(-3)
  })

  it('keeps averageWeightKg null for a month where only calories were logged', () => {
    const entries = [
      entry('2026-03-05', { calorieEntries: calories(1900) }),
    ]

    const [summary] = monthlySummaries(entries)

    expect(summary.averageWeightKg).toBeNull()
    expect(summary.averageCalories).toBe(1900)
  })

  it('averages macros only over the days that logged each one (#53 reasoning)', () => {
    const entries = [
      entry('2026-03-05', {
        calorieEntries: calories(1900, { proteinG: 100, fatG: 60 }),
      }),
      // No carbs logged all month; second day logs protein but not fat.
      entry('2026-03-15', {
        calorieEntries: calories(1800, { proteinG: 80 }),
      }),
    ]

    const [summary] = monthlySummaries(entries)

    expect(summary.averageProteinG).toBe(90) // (100 + 80) / 2
    expect(summary.averageFatG).toBe(60) // only one day logged fat
    expect(summary.averageCarbsG).toBeNull() // never logged
  })

  it('groups entries by calendar month, not a rolling 30-day window', () => {
    const entries = [
      entry('2026-01-31', { weightKg: 80 }),
      entry('2026-02-01', { weightKg: 90 }),
    ]

    const [jan, feb] = monthlySummaries(entries)

    expect(jan.monthStart).toBe('2026-01-01')
    expect(jan.averageWeightKg).toBe(80)
    expect(feb.monthStart).toBe('2026-02-01')
    expect(feb.averageWeightKg).toBe(90)
  })

  it('does not compute a delta across a gap month with no entries', () => {
    const entries = [
      entry('2026-01-05', { weightKg: 80 }),
      // February has no entries at all — no summary row for it.
      entry('2026-03-05', { weightKg: 75 }),
    ]

    const summaries = monthlySummaries(entries)

    expect(summaries).toHaveLength(2)
    expect(summaries[1].monthStart).toBe('2026-03-01')
    expect(summaries[1].deltaVsPriorMonthKg).toBe(-5)
  })
})
