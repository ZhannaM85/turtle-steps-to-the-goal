import { addDays, format, startOfISOWeek } from 'date-fns'
import { describe, expect, it } from 'vitest'
import type { CalorieEntry, DailyEntry } from '@/domain/dailyEntry'
import { correlationInsight } from './correlationInsight'

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
      amountKcal,
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

describe('correlationInsight', () => {
  it('returns null with no entries', () => {
    expect(correlationInsight([])).toBeNull()
  })

  it('returns null with fewer than 4 comparable weeks', () => {
    const entries = [
      entry(weekStart(0), { weightKg: 90 }),
      entry(weekStart(1), { weightKg: 88, calorieEntries: calories(1800) }),
      entry(weekStart(2), { weightKg: 86, calorieEntries: calories(2200) }),
    ]

    expect(correlationInsight(entries)).toBeNull()
  })

  it('reports the lower-calorie half averaging more loss', () => {
    const entries = [
      entry(weekStart(0), { weightKg: 90 }),
      entry(weekStart(1), { weightKg: 88, calorieEntries: calories(1700) }), // delta -2
      entry(weekStart(2), { weightKg: 86, calorieEntries: calories(1800) }), // delta -2
      entry(weekStart(3), { weightKg: 85.5, calorieEntries: calories(2200) }), // delta -0.5
      entry(weekStart(4), { weightKg: 85.3, calorieEntries: calories(2300) }), // delta -0.2
    ]

    const insight = correlationInsight(entries)
    expect(insight).not.toBeNull()
    expect(insight!.weekCount).toBe(4)
    expect(insight!.lowerAveragedMoreLoss).toBe(true)
    expect(insight!.lowerGroupAvgDeltaKg).toBeCloseTo(-2, 5)
    expect(insight!.higherGroupAvgDeltaKg).toBeCloseTo(-0.35, 5)
  })

  it('reports the higher-calorie half averaging more loss when that is what the data shows', () => {
    const entries = [
      entry(weekStart(0), { weightKg: 90 }),
      entry(weekStart(1), { weightKg: 89.8, calorieEntries: calories(1700) }), // delta -0.2
      entry(weekStart(2), { weightKg: 89.5, calorieEntries: calories(1800) }), // delta -0.3
      entry(weekStart(3), { weightKg: 87.5, calorieEntries: calories(2200) }), // delta -2
      entry(weekStart(4), { weightKg: 85.5, calorieEntries: calories(2300) }), // delta -2
    ]

    const insight = correlationInsight(entries)
    expect(insight!.lowerAveragedMoreLoss).toBe(false)
  })

  it('rounds the threshold to the nearest 50 kcal', () => {
    const entries = [
      entry(weekStart(0), { weightKg: 90 }),
      entry(weekStart(1), { weightKg: 88, calorieEntries: calories(1810) }),
      entry(weekStart(2), { weightKg: 86, calorieEntries: calories(1830) }),
      entry(weekStart(3), { weightKg: 85, calorieEntries: calories(2210) }),
      entry(weekStart(4), { weightKg: 84, calorieEntries: calories(2230) }),
    ]

    const insight = correlationInsight(entries)
    expect(insight!.thresholdKcal % 50).toBe(0)
  })
})
