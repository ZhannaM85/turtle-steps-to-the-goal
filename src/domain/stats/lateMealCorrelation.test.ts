import { addDays, format } from 'date-fns'
import { describe, expect, it } from 'vitest'
import type { CalorieEntry, DailyEntry } from '@/domain/dailyEntry'
import { lateMealCorrelation } from './lateMealCorrelation'

const DATE_FORMAT = 'yyyy-MM-dd'
const DAY_0 = '2026-03-01'

function day(offset: number): string {
  return format(
    addDays(new Date(`${DAY_0}T00:00:00.000Z`), offset),
    DATE_FORMAT,
  )
}

function mealAt(timeEaten: string): CalorieEntry[] {
  return [
    {
      id: crypto.randomUUID(),
      items: [{ id: crypto.randomUUID(), amountKcal: 500 }],
      timeEaten,
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

describe('lateMealCorrelation', () => {
  it('returns null with no entries', () => {
    expect(lateMealCorrelation([])).toBeNull()
  })

  it('returns null with fewer than 8 comparable day-pairs', () => {
    const entries = [
      entry(day(0), { weightKg: 80, calorieEntries: mealAt('12:00') }),
      entry(day(1), { weightKg: 80.1, calorieEntries: mealAt('22:00') }),
      entry(day(2), { weightKg: 80.5 }),
    ]

    expect(lateMealCorrelation(entries)).toBeNull()
  })

  it('reports the later-eating half averaging more next-day gain', () => {
    const entries = [
      entry(day(0), { weightKg: 80.0, calorieEntries: mealAt('12:00') }),
      entry(day(1), { weightKg: 80.1, calorieEntries: mealAt('12:30') }),
      entry(day(2), { weightKg: 80.2, calorieEntries: mealAt('13:00') }),
      entry(day(3), { weightKg: 80.25, calorieEntries: mealAt('13:30') }),
      entry(day(4), { weightKg: 80.4, calorieEntries: mealAt('22:00') }),
      entry(day(5), { weightKg: 81.2, calorieEntries: mealAt('22:30') }),
      entry(day(6), { weightKg: 81.9, calorieEntries: mealAt('23:00') }),
      entry(day(7), { weightKg: 82.8, calorieEntries: mealAt('23:30') }),
      entry(day(8), { weightKg: 83.4 }),
    ]

    const result = lateMealCorrelation(entries)
    expect(result).not.toBeNull()
    expect(result!.dayCount).toBe(8)
    expect(result!.laterAveragedMoreGain).toBe(true)
    expect(result!.earlierGroupAvgDeltaKg).toBeCloseTo(0.1, 5)
    expect(result!.laterGroupAvgDeltaKg).toBeCloseTo(0.75, 5)
  })

  it('reports the earlier-eating half averaging more gain when that is what the data shows', () => {
    const entries = [
      entry(day(0), { weightKg: 80.0, calorieEntries: mealAt('12:00') }),
      entry(day(1), { weightKg: 80.8, calorieEntries: mealAt('12:30') }),
      entry(day(2), { weightKg: 81.7, calorieEntries: mealAt('13:00') }),
      entry(day(3), { weightKg: 82.5, calorieEntries: mealAt('13:30') }),
      entry(day(4), { weightKg: 82.6, calorieEntries: mealAt('22:00') }),
      entry(day(5), { weightKg: 82.65, calorieEntries: mealAt('22:30') }),
      entry(day(6), { weightKg: 82.75, calorieEntries: mealAt('23:00') }),
      entry(day(7), { weightKg: 82.8, calorieEntries: mealAt('23:30') }),
      entry(day(8), { weightKg: 82.85 }),
    ]

    const result = lateMealCorrelation(entries)
    expect(result!.laterAveragedMoreGain).toBe(false)
  })

  it('rounds the threshold to the nearest 15 minutes', () => {
    const entries = [
      entry(day(0), { weightKg: 80.0, calorieEntries: mealAt('12:03') }),
      entry(day(1), { weightKg: 80.1, calorieEntries: mealAt('12:33') }),
      entry(day(2), { weightKg: 80.2, calorieEntries: mealAt('13:03') }),
      entry(day(3), { weightKg: 80.25, calorieEntries: mealAt('13:33') }),
      entry(day(4), { weightKg: 80.4, calorieEntries: mealAt('22:03') }),
      entry(day(5), { weightKg: 81.2, calorieEntries: mealAt('22:33') }),
      entry(day(6), { weightKg: 81.9, calorieEntries: mealAt('23:03') }),
      entry(day(7), { weightKg: 82.8, calorieEntries: mealAt('23:33') }),
      entry(day(8), { weightKg: 83.4 }),
    ]

    const result = lateMealCorrelation(entries)
    expect(result!.thresholdMinutes % 15).toBe(0)
  })

  it('ignores a day with no meal time logged', () => {
    const entries = [
      entry(day(0), { weightKg: 80.0 }), // no calorieEntries at all
      entry(day(1), { weightKg: 80.5 }),
    ]

    expect(lateMealCorrelation(entries)).toBeNull()
  })

  it('ignores a day whose next calendar date has no logged weight', () => {
    const entries = [
      entry(day(0), { weightKg: 80.0, calorieEntries: mealAt('12:00') }),
      // day(1) missing entirely — no next-day weight to pair with.
      entry(day(2), { weightKg: 81.0, calorieEntries: mealAt('12:00') }),
      entry(day(3), { weightKg: 81.5 }),
    ]

    expect(lateMealCorrelation(entries)).toBeNull()
  })

  it('uses the latest of multiple meal times logged on the same day', () => {
    const entries = [
      entry(day(0), { weightKg: 80.0, calorieEntries: mealAt('12:00') }),
      entry(day(1), { weightKg: 80.1, calorieEntries: mealAt('12:30') }),
      entry(day(2), { weightKg: 80.2, calorieEntries: mealAt('13:00') }),
      entry(day(3), { weightKg: 80.25, calorieEntries: mealAt('13:30') }),
      // An early decoy meal alongside the real 22:00 one — if the function
      // used the first/earliest time instead of the latest, this day would
      // wrongly land in the "earlier" group instead of "later".
      entry(day(4), {
        weightKg: 80.4,
        calorieEntries: [...mealAt('06:00'), ...mealAt('22:00')],
      }),
      entry(day(5), { weightKg: 81.2, calorieEntries: mealAt('22:30') }),
      entry(day(6), { weightKg: 81.9, calorieEntries: mealAt('23:00') }),
      entry(day(7), { weightKg: 82.8, calorieEntries: mealAt('23:30') }),
      entry(day(8), { weightKg: 83.4 }),
    ]

    const result = lateMealCorrelation(entries)
    expect(result!.laterAveragedMoreGain).toBe(true)
    expect(result!.laterGroupAvgDeltaKg).toBeCloseTo(0.75, 5)
  })
})
