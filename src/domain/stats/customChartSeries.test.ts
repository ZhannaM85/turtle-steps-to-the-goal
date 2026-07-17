import { describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import { booleanFlagDates, customChartPoints } from './customChartSeries'

function entry(date: string, overrides: Partial<DailyEntry> = {}): DailyEntry {
  const now = '2026-01-01T00:00:00.000Z'
  return {
    id: `entry-${date}`,
    date,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

describe('customChartPoints', () => {
  it('returns an empty array with no entries', () => {
    expect(customChartPoints([], ['weight'])).toEqual([])
  })

  it('sorts points by date ascending regardless of input order', () => {
    const entries = [
      entry('2026-01-03', { weightKg: 82 }),
      entry('2026-01-01', { weightKg: 80 }),
      entry('2026-01-02', { weightKg: 81 }),
    ]

    expect(customChartPoints(entries, ['weight']).map((p) => p.date)).toEqual([
      '2026-01-01',
      '2026-01-02',
      '2026-01-03',
    ])
  })

  it('normalizes a series to 0-100 within its own min/max range', () => {
    const entries = [
      entry('2026-01-01', { weightKg: 80 }),
      entry('2026-01-02', { weightKg: 82 }),
      entry('2026-01-03', { weightKg: 84 }),
    ]

    const points = customChartPoints(entries, ['weight'])
    expect(points[0].normalized.weight).toBe(0)
    expect(points[1].normalized.weight).toBe(50)
    expect(points[2].normalized.weight).toBe(100)
    // Raw values are untouched, for the tooltip to read the real number.
    expect(points.map((p) => p.raw.weight)).toEqual([80, 82, 84])
  })

  it('normalizes a series with no variance to a flat 50, not a divide-by-zero', () => {
    const entries = [
      entry('2026-01-01', { weightKg: 80 }),
      entry('2026-01-02', { weightKg: 80 }),
    ]

    const points = customChartPoints(entries, ['weight'])
    expect(points.every((p) => p.normalized.weight === 50)).toBe(true)
  })

  it('normalizes each series independently, not against each other', () => {
    const entries = [
      entry('2026-01-01', { weightKg: 80, steps: 5000 }),
      entry('2026-01-02', { weightKg: 90, steps: 10000 }),
    ]

    const points = customChartPoints(entries, ['weight', 'steps'])
    expect(points[0].normalized).toEqual({ weight: 0, steps: 0 })
    expect(points[1].normalized).toEqual({ weight: 100, steps: 100 })
  })

  it('leaves a series absent for a day it was never logged, not defaulted to 0', () => {
    const entries = [
      entry('2026-01-01', { weightKg: 80 }),
      entry('2026-01-02', {}),
    ]

    const points = customChartPoints(entries, ['weight'])
    expect(points[1].raw.weight).toBeUndefined()
    expect(points[1].normalized.weight).toBeUndefined()
  })

  it('sums calories/protein/fat/carbs across every meal item, same as the other dashboard charts', () => {
    const entries = [
      entry('2026-01-01', {
        calorieEntries: [
          {
            id: 'c1',
            items: [
              { id: 'i1', amountKcal: 200, proteinG: 10, fatG: 5, carbsG: 20 },
              { id: 'i2', amountKcal: 100, proteinG: 5 },
            ],
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      }),
    ]

    const [point] = customChartPoints(entries, [
      'calories',
      'protein',
      'fat',
      'carbs',
    ])
    expect(point.raw).toEqual({
      calories: 300,
      protein: 15,
      fat: 5,
      carbs: 20,
    })
  })
})

describe('booleanFlagDates', () => {
  it('returns only the dates where the flag is true', () => {
    const entries = [
      entry('2026-01-01', { onPeriod: true }),
      entry('2026-01-02', { onPeriod: false }),
      entry('2026-01-03', {}),
      entry('2026-01-04', { onPeriod: true }),
    ]

    expect(booleanFlagDates(entries, 'onPeriod')).toEqual([
      '2026-01-01',
      '2026-01-04',
    ])
  })

  it('reads hadBowelMovement independently of onPeriod', () => {
    const entries = [entry('2026-01-01', { hadBowelMovement: true })]

    expect(booleanFlagDates(entries, 'hadBowelMovement')).toEqual([
      '2026-01-01',
    ])
    expect(booleanFlagDates(entries, 'onPeriod')).toEqual([])
  })
})
