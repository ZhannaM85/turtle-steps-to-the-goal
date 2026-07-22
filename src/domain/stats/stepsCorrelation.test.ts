import { addDays, format } from 'date-fns'
import { describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import { stepsCorrelation } from './stepsCorrelation'

const DATE_FORMAT = 'yyyy-MM-dd'
const DAY_0 = '2026-03-01'

function day(offset: number): string {
  return format(
    addDays(new Date(`${DAY_0}T00:00:00.000Z`), offset),
    DATE_FORMAT,
  )
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

describe('stepsCorrelation', () => {
  it('returns null with no entries', () => {
    expect(stepsCorrelation([])).toBeNull()
  })

  it('returns null with fewer than 8 comparable day-pairs', () => {
    const entries = [
      entry(day(0), { weightKg: 80, steps: 3000 }),
      entry(day(1), { weightKg: 80.1, steps: 9000 }),
      entry(day(2), { weightKg: 80.5 }),
    ]

    expect(stepsCorrelation(entries)).toBeNull()
  })

  it('reports the fewer-steps half averaging more next-day gain', () => {
    const entries = [
      entry(day(0), { weightKg: 80.0, steps: 2000 }),
      entry(day(1), { weightKg: 80.8, steps: 2500 }),
      entry(day(2), { weightKg: 81.7, steps: 3000 }),
      entry(day(3), { weightKg: 82.5, steps: 3500 }),
      entry(day(4), { weightKg: 82.6, steps: 9000 }),
      entry(day(5), { weightKg: 82.65, steps: 9500 }),
      entry(day(6), { weightKg: 82.75, steps: 10000 }),
      entry(day(7), { weightKg: 82.8, steps: 10500 }),
      entry(day(8), { weightKg: 82.85 }),
    ]

    const result = stepsCorrelation(entries)
    expect(result).not.toBeNull()
    expect(result!.dayCount).toBe(8)
    expect(result!.fewerAveragedMoreGain).toBe(true)
    // #224 — a 0.59kg gap between the two groups' averages clears the
    // 0.15kg "strong" daily threshold.
    expect(result!.strength).toBe('strong')
  })

  it('reports the more-steps half averaging more gain when that is what the data shows', () => {
    const entries = [
      entry(day(0), { weightKg: 80.0, steps: 2000 }),
      entry(day(1), { weightKg: 80.1, steps: 2500 }),
      entry(day(2), { weightKg: 80.2, steps: 3000 }),
      entry(day(3), { weightKg: 80.25, steps: 3500 }),
      entry(day(4), { weightKg: 80.4, steps: 9000 }),
      entry(day(5), { weightKg: 81.2, steps: 9500 }),
      entry(day(6), { weightKg: 81.9, steps: 10000 }),
      entry(day(7), { weightKg: 82.8, steps: 10500 }),
      entry(day(8), { weightKg: 83.4 }),
    ]

    const result = stepsCorrelation(entries)
    expect(result!.fewerAveragedMoreGain).toBe(false)
  })

  it('ignores a day with no steps logged', () => {
    const entries = [
      entry(day(0), { weightKg: 80.0 }),
      entry(day(1), { weightKg: 80.5 }),
    ]

    expect(stepsCorrelation(entries)).toBeNull()
  })

  it('ignores a day whose next calendar date has no logged weight', () => {
    const entries = [
      entry(day(0), { weightKg: 80.0, steps: 5000 }),
      // day(1) missing entirely — no next-day weight to pair with.
      entry(day(2), { weightKg: 81.0, steps: 5000 }),
      entry(day(3), { weightKg: 81.5 }),
    ]

    expect(stepsCorrelation(entries)).toBeNull()
  })
})
