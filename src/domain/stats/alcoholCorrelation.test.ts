import { addDays, format } from 'date-fns'
import { describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import { alcoholCorrelation } from './alcoholCorrelation'

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

describe('alcoholCorrelation (#607)', () => {
  it('returns null with no entries', () => {
    expect(alcoholCorrelation([])).toBeNull()
  })

  it('returns null with fewer than 8 comparable day-pairs', () => {
    const entries = [
      entry(day(0), { weightKg: 80, hadAlcohol: true }),
      entry(day(1), { weightKg: 80.5 }),
    ]

    expect(alcoholCorrelation(entries)).toBeNull()
  })

  it('returns null when every comparable day falls in the same group', () => {
    const entries = Array.from({ length: 9 }, (_, i) =>
      entry(day(i), { weightKg: 80 + i * 0.1, hadAlcohol: false }),
    )

    expect(alcoholCorrelation(entries)).toBeNull()
  })

  it('reports the alcohol group averaging more next-day gain', () => {
    const entries = [
      entry(day(0), { weightKg: 80.0, hadAlcohol: false }),
      entry(day(1), { weightKg: 80.1, hadAlcohol: false }),
      entry(day(2), { weightKg: 80.2, hadAlcohol: false }),
      entry(day(3), { weightKg: 80.25, hadAlcohol: false }),
      entry(day(4), { weightKg: 80.4, hadAlcohol: true }),
      entry(day(5), { weightKg: 81.2, hadAlcohol: true }),
      entry(day(6), { weightKg: 81.9, hadAlcohol: true }),
      entry(day(7), { weightKg: 82.8, hadAlcohol: true }),
      entry(day(8), { weightKg: 83.4 }),
    ]

    const result = alcoholCorrelation(entries)
    expect(result).not.toBeNull()
    expect(result!.dayCount).toBe(8)
    expect(result!.alcoholAveragedMoreGain).toBe(true)
    expect(result!.noAlcoholGroupAvgDeltaKg).toBeCloseTo(0.1, 5)
    expect(result!.alcoholGroupAvgDeltaKg).toBeCloseTo(0.75, 5)
    expect(result!.strength).toBe('strong')
  })

  it('excludes a day with no logged alcohol value at all, rather than counting it as "No"', () => {
    const trackedDays = [
      entry(day(0), { weightKg: 80.0, hadAlcohol: false }),
      entry(day(1), { weightKg: 80.1, hadAlcohol: false }),
      entry(day(2), { weightKg: 80.2, hadAlcohol: false }),
      entry(day(3), { weightKg: 80.25, hadAlcohol: false }),
      entry(day(4), { weightKg: 80.4, hadAlcohol: true }),
      entry(day(5), { weightKg: 81.2, hadAlcohol: true }),
      entry(day(6), { weightKg: 81.9, hadAlcohol: true }),
      entry(day(7), { weightKg: 82.8, hadAlcohol: true }),
      entry(day(8), { weightKg: 83.4 }),
    ]
    const untrackedDays = Array.from({ length: 8 }, (_, i) =>
      entry(day(9 + i), { weightKg: 83.4 + i * 0.05 }),
    )

    const result = alcoholCorrelation([...trackedDays, ...untrackedDays])
    expect(result).not.toBeNull()
    expect(result!.dayCount).toBe(8)
    expect(result!.noAlcoholGroupAvgDeltaKg).toBeCloseTo(0.1, 5)
  })

  it('ignores a day whose next calendar date has no logged weight', () => {
    const entries = [
      entry(day(0), { weightKg: 80.0, hadAlcohol: true }),
      // day(1) missing entirely — no next-day weight to pair with.
      entry(day(2), { weightKg: 81.0, hadAlcohol: true }),
      entry(day(3), { weightKg: 81.5 }),
    ]

    expect(alcoholCorrelation(entries)).toBeNull()
  })
})
