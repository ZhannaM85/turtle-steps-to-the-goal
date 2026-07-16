import { addDays, format, startOfISOWeek } from 'date-fns'
import { describe, expect, it } from 'vitest'
import type { CalorieEntry, DailyEntry } from '@/domain/dailyEntry'
import { correlation } from './correlation'

const DATE_FORMAT = 'yyyy-MM-dd'
const WEEK_1_START = format(
  startOfISOWeek(new Date('2026-03-02T00:00:00.000Z')),
  DATE_FORMAT,
)

function weekStart(weekIndex: number): string {
  return format(
    addDays(new Date(`${WEEK_1_START}T00:00:00.000Z`), weekIndex * 7),
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

describe('correlation', () => {
  it('returns null for no entries', () => {
    expect(correlation([])).toBeNull()
  })

  it('returns null with a single data point (only one week, no delta possible)', () => {
    const entries = [
      entry(weekStart(0), { weightKg: 80, calorieEntries: calories(2000) }),
    ]

    expect(correlation(entries)).toBeNull()
  })

  it('returns null when there is only one comparable week (two weeks total)', () => {
    const entries = [
      entry(weekStart(0), { weightKg: 90 }),
      entry(weekStart(1), { weightKg: 87, calorieEntries: calories(1800) }),
    ]

    expect(correlation(entries)).toBeNull()
  })

  it('returns null when calories have no variance', () => {
    const entries = [
      entry(weekStart(0), { weightKg: 90 }),
      entry(weekStart(1), { weightKg: 87, calorieEntries: calories(2000) }),
      entry(weekStart(2), { weightKg: 84, calorieEntries: calories(2000) }),
    ]

    expect(correlation(entries)).toBeNull()
  })

  it('returns null when weight change has no variance', () => {
    const entries = [
      entry(weekStart(0), { weightKg: 90 }),
      entry(weekStart(1), { weightKg: 87, calorieEntries: calories(1800) }),
      entry(weekStart(2), { weightKg: 84, calorieEntries: calories(2200) }),
    ]

    expect(correlation(entries)).toBeNull()
  })

  it('returns +1 for a perfectly linear relationship (more calories, less loss)', () => {
    const entries = [
      entry(weekStart(0), { weightKg: 90 }),
      entry(weekStart(1), { weightKg: 87, calorieEntries: calories(1800) }), // delta -3
      entry(weekStart(2), { weightKg: 85, calorieEntries: calories(2000) }), // delta -2
      entry(weekStart(3), { weightKg: 84, calorieEntries: calories(2200) }), // delta -1
    ]

    expect(correlation(entries)).toBeCloseTo(1, 10)
  })

  it('returns -1 for a perfectly linear inverse relationship (more calories, more loss)', () => {
    const entries = [
      entry(weekStart(0), { weightKg: 90 }),
      entry(weekStart(1), { weightKg: 87, calorieEntries: calories(2200) }), // delta -3
      entry(weekStart(2), { weightKg: 85, calorieEntries: calories(2000) }), // delta -2
      entry(weekStart(3), { weightKg: 84, calorieEntries: calories(1800) }), // delta -1
    ]

    expect(correlation(entries)).toBeCloseTo(-1, 10)
  })
})
