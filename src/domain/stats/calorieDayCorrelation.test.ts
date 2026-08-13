import { addDays, format } from 'date-fns'
import { describe, expect, it } from 'vitest'
import type { CalorieEntry, DailyEntry } from '@/domain/dailyEntry'
import { calorieDayCorrelation, calorieDayPoints } from './calorieDayCorrelation'

const DATE_FORMAT = 'yyyy-MM-dd'
const DAY_0 = '2026-03-01'

function day(offset: number): string {
  return format(
    addDays(new Date(`${DAY_0}T00:00:00.000Z`), offset),
    DATE_FORMAT,
  )
}

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

describe('calorieDayCorrelation', () => {
  it('returns null with no entries', () => {
    expect(calorieDayCorrelation([])).toBeNull()
  })

  it('returns null with fewer than 8 comparable day-pairs', () => {
    const entries = [
      entry(day(0), { weightKg: 80, calorieEntries: calories(1800) }),
      entry(day(1), { weightKg: 80.1, calorieEntries: calories(2200) }),
      entry(day(2), { weightKg: 80.5 }),
    ]

    expect(calorieDayCorrelation(entries)).toBeNull()
  })

  it('reports the lower-calorie half averaging more next-day gain', () => {
    const entries = [
      entry(day(0), { weightKg: 80.0, calorieEntries: calories(1400) }),
      entry(day(1), { weightKg: 80.8, calorieEntries: calories(1500) }),
      entry(day(2), { weightKg: 81.7, calorieEntries: calories(1600) }),
      entry(day(3), { weightKg: 82.5, calorieEntries: calories(1700) }),
      entry(day(4), { weightKg: 82.6, calorieEntries: calories(2400) }),
      entry(day(5), { weightKg: 82.65, calorieEntries: calories(2500) }),
      entry(day(6), { weightKg: 82.75, calorieEntries: calories(2600) }),
      entry(day(7), { weightKg: 82.8, calorieEntries: calories(2700) }),
      entry(day(8), { weightKg: 82.85 }),
    ]

    const result = calorieDayCorrelation(entries)
    expect(result).not.toBeNull()
    expect(result!.dayCount).toBe(8)
    expect(result!.lowerAveragedMoreGain).toBe(true)
    expect(result!.strength).toBe('strong')
  })

  it('reports the higher-calorie half averaging more gain when that is what the data shows', () => {
    const entries = [
      entry(day(0), { weightKg: 80.0, calorieEntries: calories(1400) }),
      entry(day(1), { weightKg: 80.1, calorieEntries: calories(1500) }),
      entry(day(2), { weightKg: 80.2, calorieEntries: calories(1600) }),
      entry(day(3), { weightKg: 80.25, calorieEntries: calories(1700) }),
      entry(day(4), { weightKg: 80.4, calorieEntries: calories(2400) }),
      entry(day(5), { weightKg: 81.2, calorieEntries: calories(2500) }),
      entry(day(6), { weightKg: 81.9, calorieEntries: calories(2600) }),
      entry(day(7), { weightKg: 82.8, calorieEntries: calories(2700) }),
      entry(day(8), { weightKg: 83.4 }),
    ]

    const result = calorieDayCorrelation(entries)
    expect(result!.lowerAveragedMoreGain).toBe(false)
  })

  it('ignores a day with no calories logged', () => {
    const entries = [
      entry(day(0), { weightKg: 80.0 }),
      entry(day(1), { weightKg: 80.5 }),
    ]

    expect(calorieDayPoints(entries)).toHaveLength(0)
    expect(calorieDayCorrelation(entries)).toBeNull()
  })

  it('ignores a day whose next calendar date has no logged weight', () => {
    const entries = [
      entry(day(0), { weightKg: 80.0, calorieEntries: calories(2000) }),
      entry(day(2), { weightKg: 81.0, calorieEntries: calories(2000) }),
      entry(day(3), { weightKg: 81.5 }),
    ]

    expect(calorieDayCorrelation(entries)).toBeNull()
  })

  it('includes dayTotals-only calorie days (#549)', () => {
    const entries = [
      entry(day(0), {
        weightKg: 80.0,
        dayTotals: { amountKcal: 1400 },
      }),
      entry(day(1), { weightKg: 80.8, dayTotals: { amountKcal: 1500 } }),
      entry(day(2), { weightKg: 81.7, dayTotals: { amountKcal: 1600 } }),
      entry(day(3), { weightKg: 82.5, dayTotals: { amountKcal: 1700 } }),
      entry(day(4), { weightKg: 82.6, dayTotals: { amountKcal: 2400 } }),
      entry(day(5), { weightKg: 82.65, dayTotals: { amountKcal: 2500 } }),
      entry(day(6), { weightKg: 82.75, dayTotals: { amountKcal: 2600 } }),
      entry(day(7), { weightKg: 82.8, dayTotals: { amountKcal: 2700 } }),
      entry(day(8), { weightKg: 82.85 }),
    ]

    expect(calorieDayCorrelation(entries)?.dayCount).toBe(8)
  })
})
