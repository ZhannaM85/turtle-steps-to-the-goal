import { addDays, format } from 'date-fns'
import { describe, expect, it } from 'vitest'
import type { CalorieEntry, DailyEntry } from '@/domain/dailyEntry'
import {
  fastingCutoffComparison,
  fastingWindowCorrelation,
  fastingWindowPoints,
} from './fastingWindow'

const DATE_FORMAT = 'yyyy-MM-dd'
const DAY_0 = '2026-03-01'

function day(offset: number): string {
  return format(
    addDays(new Date(`${DAY_0}T00:00:00.000Z`), offset),
    DATE_FORMAT,
  )
}

function mealAt(...times: string[]): CalorieEntry[] {
  return times.map((timeEaten) => ({
    id: crypto.randomUUID(),
    items: [{ id: crypto.randomUUID(), amountKcal: 500 }],
    timeEaten,
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

describe('fastingWindowPoints', () => {
  it('returns an empty array with no entries', () => {
    expect(fastingWindowPoints([])).toEqual([])
  })

  it('computes the elapsed hours from the previous day\'s last meal to the next day\'s first meal, spanning midnight', () => {
    const entries = [
      entry(day(0), { weightKg: 80.0, calorieEntries: mealAt('20:00') }),
      entry(day(1), { weightKg: 80.5, calorieEntries: mealAt('08:00') }),
    ]

    const points = fastingWindowPoints(entries)
    expect(points).toEqual([{ date: day(1), fastingHours: 12, deltaKg: 0.5 }])
  })

  it('uses the previous day\'s latest meal and the next day\'s earliest meal, not the other way around', () => {
    const entries = [
      // Decoy early meal alongside the real 20:00 one.
      entry(day(0), { weightKg: 80.0, calorieEntries: mealAt('06:00', '20:00') }),
      // Decoy late meal alongside the real 08:00 one.
      entry(day(1), { weightKg: 80.5, calorieEntries: mealAt('08:00', '22:00') }),
    ]

    const points = fastingWindowPoints(entries)
    expect(points).toEqual([{ date: day(1), fastingHours: 12, deltaKg: 0.5 }])
  })

  it('ignores a day with no meal time logged', () => {
    const entries = [
      entry(day(0), { weightKg: 80.0 }),
      entry(day(1), { weightKg: 80.5, calorieEntries: mealAt('08:00') }),
    ]

    expect(fastingWindowPoints(entries)).toEqual([])
  })

  it('ignores a pair whose next day has no meal time logged', () => {
    const entries = [
      entry(day(0), { weightKg: 80.0, calorieEntries: mealAt('20:00') }),
      entry(day(1), { weightKg: 80.5 }),
    ]

    expect(fastingWindowPoints(entries)).toEqual([])
  })

  it('ignores a pair whose next calendar date has no logged weight', () => {
    const entries = [
      entry(day(0), { weightKg: 80.0, calorieEntries: mealAt('20:00') }),
      entry(day(2), { weightKg: 81.0, calorieEntries: mealAt('08:00') }),
    ]

    expect(fastingWindowPoints(entries)).toEqual([])
  })
})

describe('fastingWindowCorrelation', () => {
  it('returns null with no entries', () => {
    expect(fastingWindowCorrelation([])).toBeNull()
  })

  it('returns null with fewer than 10 comparable day-pairs', () => {
    const entries = [
      entry(day(0), { weightKg: 80.0, calorieEntries: mealAt('20:00') }),
      entry(day(1), { weightKg: 80.5, calorieEntries: mealAt('08:00') }),
    ]

    expect(fastingWindowCorrelation(entries)).toBeNull()
  })

  it('reports the shorter-fast half averaging more next-day gain', () => {
    // Alternating meal times (22:00/07:00) produce alternating short (9h)
    // and long (39h) fasting pairs — 5 of each across 10 consecutive pairs.
    // Weight climbs faster across the short-fast pairs than the long ones.
    const entries = [
      entry(day(0), { weightKg: 80.0, calorieEntries: mealAt('22:00') }),
      entry(day(1), { weightKg: 80.5, calorieEntries: mealAt('07:00') }),
      entry(day(2), { weightKg: 80.55, calorieEntries: mealAt('22:00') }),
      entry(day(3), { weightKg: 81.05, calorieEntries: mealAt('07:00') }),
      entry(day(4), { weightKg: 81.1, calorieEntries: mealAt('22:00') }),
      entry(day(5), { weightKg: 81.6, calorieEntries: mealAt('07:00') }),
      entry(day(6), { weightKg: 81.65, calorieEntries: mealAt('22:00') }),
      entry(day(7), { weightKg: 82.15, calorieEntries: mealAt('07:00') }),
      entry(day(8), { weightKg: 82.2, calorieEntries: mealAt('22:00') }),
      entry(day(9), { weightKg: 82.7, calorieEntries: mealAt('07:00') }),
      entry(day(10), { weightKg: 82.75, calorieEntries: mealAt('22:00') }),
    ]

    const result = fastingWindowCorrelation(entries)
    expect(result).not.toBeNull()
    expect(result!.dayCount).toBe(10)
    expect(result!.thresholdHours).toBe(24)
    expect(result!.shorterAveragedMoreGain).toBe(true)
    expect(result!.shorterGroupAvgDeltaKg).toBeCloseTo(0.5, 5)
    expect(result!.longerGroupAvgDeltaKg).toBeCloseTo(0.05, 5)
    // A 0.45kg gap clears the 0.15kg "strong" daily threshold (#224).
    expect(result!.strength).toBe('strong')
  })
})

describe('fastingCutoffComparison', () => {
  it('returns null with no entries', () => {
    expect(fastingCutoffComparison([], '18:00')).toBeNull()
  })

  it('returns null with fewer than 8 comparable day-pairs', () => {
    const entries = [
      entry(day(0), { weightKg: 80.0, calorieEntries: mealAt('12:00') }),
      entry(day(1), { weightKg: 80.5, calorieEntries: mealAt('22:00') }),
    ]

    expect(fastingCutoffComparison(entries, '18:00')).toBeNull()
  })

  it('buckets by the previous day\'s last meal vs. a fixed cutoff, not a median', () => {
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

    const result = fastingCutoffComparison(entries, '18:00')
    expect(result).not.toBeNull()
    expect(result!.dayCount).toBe(8)
    expect(result!.cutoffMinutes).toBe(18 * 60)
    expect(result!.beforeGroupAvgDeltaKg).toBeCloseTo(0.1, 5)
    expect(result!.afterGroupAvgDeltaKg).toBeCloseTo(0.75, 5)
    expect(result!.afterAveragedMoreGain).toBe(true)
    expect(result!.strength).toBe('strong')
  })

  it('returns null when the cutoff puts every pair on the same side', () => {
    const entries = [
      entry(day(0), { weightKg: 80.0, calorieEntries: mealAt('12:00') }),
      entry(day(1), { weightKg: 80.1, calorieEntries: mealAt('12:30') }),
      entry(day(2), { weightKg: 80.2, calorieEntries: mealAt('13:00') }),
      entry(day(3), { weightKg: 80.25, calorieEntries: mealAt('13:30') }),
      entry(day(4), { weightKg: 80.4, calorieEntries: mealAt('14:00') }),
      entry(day(5), { weightKg: 81.2, calorieEntries: mealAt('14:30') }),
      entry(day(6), { weightKg: 81.9, calorieEntries: mealAt('15:00') }),
      entry(day(7), { weightKg: 82.8, calorieEntries: mealAt('15:30') }),
      entry(day(8), { weightKg: 83.4 }),
    ]

    // Every last-meal time above is after 00:01, so nothing ever lands
    // in the "before" bucket.
    expect(fastingCutoffComparison(entries, '00:01')).toBeNull()
  })
})
