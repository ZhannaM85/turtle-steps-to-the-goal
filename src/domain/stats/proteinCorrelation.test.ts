import { addDays, format } from 'date-fns'
import { describe, expect, it } from 'vitest'
import type { CalorieEntry, DailyEntry } from '@/domain/dailyEntry'
import { proteinCorrelation } from './proteinCorrelation'

const DATE_FORMAT = 'yyyy-MM-dd'
const DAY_0 = '2026-03-01'

function day(offset: number): string {
  return format(
    addDays(new Date(`${DAY_0}T00:00:00.000Z`), offset),
    DATE_FORMAT,
  )
}

function protein(proteinG: number): CalorieEntry[] {
  return [
    {
      id: crypto.randomUUID(),
      items: [{ id: crypto.randomUUID(), amountKcal: 100, proteinG }],
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

describe('proteinCorrelation', () => {
  it('returns null with no entries', () => {
    expect(proteinCorrelation([])).toBeNull()
  })

  it('returns null with fewer than 8 comparable day-pairs', () => {
    const entries = [
      entry(day(0), { weightKg: 80, calorieEntries: protein(80) }),
      entry(day(1), { weightKg: 80.1, calorieEntries: protein(50) }),
      entry(day(2), { weightKg: 80.5 }),
    ]

    expect(proteinCorrelation(entries)).toBeNull()
  })

  it('reports the less-protein half averaging more next-day gain', () => {
    const entries = [
      entry(day(0), { weightKg: 80.0, calorieEntries: protein(40) }),
      entry(day(1), { weightKg: 80.8, calorieEntries: protein(45) }),
      entry(day(2), { weightKg: 81.7, calorieEntries: protein(50) }),
      entry(day(3), { weightKg: 82.5, calorieEntries: protein(55) }),
      entry(day(4), { weightKg: 82.6, calorieEntries: protein(100) }),
      entry(day(5), { weightKg: 82.65, calorieEntries: protein(105) }),
      entry(day(6), { weightKg: 82.75, calorieEntries: protein(110) }),
      entry(day(7), { weightKg: 82.8, calorieEntries: protein(115) }),
      entry(day(8), { weightKg: 82.85 }),
    ]

    const result = proteinCorrelation(entries)
    expect(result).not.toBeNull()
    expect(result!.dayCount).toBe(8)
    expect(result!.lessAveragedMoreGain).toBe(true)
    // #224 — a 0.59kg gap between the two groups' averages clears the
    // 0.15kg "strong" daily threshold.
    expect(result!.strength).toBe('strong')
  })

  it('reports the more-protein half averaging more gain when that is what the data shows', () => {
    const entries = [
      entry(day(0), { weightKg: 80.0, calorieEntries: protein(40) }),
      entry(day(1), { weightKg: 80.1, calorieEntries: protein(45) }),
      entry(day(2), { weightKg: 80.2, calorieEntries: protein(50) }),
      entry(day(3), { weightKg: 80.25, calorieEntries: protein(55) }),
      entry(day(4), { weightKg: 80.4, calorieEntries: protein(100) }),
      entry(day(5), { weightKg: 81.2, calorieEntries: protein(105) }),
      entry(day(6), { weightKg: 81.9, calorieEntries: protein(110) }),
      entry(day(7), { weightKg: 82.8, calorieEntries: protein(115) }),
      entry(day(8), { weightKg: 83.4 }),
    ]

    const result = proteinCorrelation(entries)
    expect(result!.lessAveragedMoreGain).toBe(false)
  })

  it('ignores a day with no protein logged', () => {
    const entries = [
      entry(day(0), { weightKg: 80.0 }),
      entry(day(1), { weightKg: 80.5 }),
    ]

    expect(proteinCorrelation(entries)).toBeNull()
  })

  it('ignores a day whose next calendar date has no logged weight', () => {
    const entries = [
      entry(day(0), { weightKg: 80.0, calorieEntries: protein(70) }),
      // day(1) missing entirely — no next-day weight to pair with.
      entry(day(2), { weightKg: 81.0, calorieEntries: protein(70) }),
      entry(day(3), { weightKg: 81.5 }),
    ]

    expect(proteinCorrelation(entries)).toBeNull()
  })
})
