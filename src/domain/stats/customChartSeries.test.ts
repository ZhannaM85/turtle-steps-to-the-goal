import { describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import {
  booleanFlagDates,
  booleanFlagMarkers,
  customChartPoints,
  numericSeriesValueByDate,
} from './customChartSeries'

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

  it('extracts sleep from sleepHours (#440)', () => {
    const entries = [
      entry('2026-01-01', { sleepHours: 6 }),
      entry('2026-01-02', { sleepHours: 8 }),
    ]

    const points = customChartPoints(entries, ['sleep'])
    expect(points[0].raw).toEqual({ sleep: 6 })
    expect(points[1].raw).toEqual({ sleep: 8 })
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

  it('reads waist/hip/body fat as independent series (#225)', () => {
    const entries = [
      entry('2026-01-01', { waistCm: 80, hipCm: 95, bodyFatPercent: 22 }),
    ]

    const [point] = customChartPoints(entries, ['waist', 'hip', 'bodyFat'])
    expect(point.raw).toEqual({ waist: 80, hip: 95, bodyFat: 22 })
  })

  it('reads fastingHours from the previous day\'s last meal to this day\'s first (#257)', () => {
    const mealAt = (timeEaten: string) => [
      { id: crypto.randomUUID(), items: [{ id: crypto.randomUUID(), amountKcal: 500 }], timeEaten, createdAt: '2026-01-01T00:00:00.000Z' },
    ]
    const entries = [
      entry('2026-01-01', { weightKg: 80, calorieEntries: mealAt('20:00') }),
      entry('2026-01-02', { weightKg: 80.5, calorieEntries: mealAt('08:00') }),
    ]

    const points = customChartPoints(entries, ['fastingHours'])
    expect(points[0].raw.fastingHours).toBeUndefined()
    expect(points[1].raw.fastingHours).toBe(12)
  })

  it('leaves fastingHours absent entirely when it is not one of the requested series', () => {
    const entries = [entry('2026-01-01', { weightKg: 80 })]

    const [point] = customChartPoints(entries, ['weight'])
    expect(point.raw.fastingHours).toBeUndefined()
  })

  it('sums water across every logged entry that day (#325)', () => {
    const entries = [
      entry('2026-01-01', {
        waterEntries: [
          { id: 'w1', amountMl: 250 },
          { id: 'w2', amountMl: 500 },
        ],
      }),
      entry('2026-01-02', {}),
    ]

    const points = customChartPoints(entries, ['water'])
    expect(points[0].raw.water).toBe(750)
    expect(points[1].raw.water).toBeUndefined()
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

  it('reads hadConstipation independently of onPeriod', () => {
    const entries = [entry('2026-01-01', { hadConstipation: true })]

    expect(booleanFlagDates(entries, 'hadConstipation')).toEqual([
      '2026-01-01',
    ])
    expect(booleanFlagDates(entries, 'onPeriod')).toEqual([])
  })
})

describe('booleanFlagMarkers (#502)', () => {
  function axis(length: number, start = 1): string[] {
    return Array.from({ length }, (_, i) =>
      `2026-01-${String(start + i).padStart(2, '0')}`,
    )
  }

  it('keeps one dot per flagged day when they all fit', () => {
    const dates = axis(10)

    expect(
      booleanFlagMarkers(dates, ['2026-01-02', '2026-01-07'], 24),
    ).toEqual([
      { date: '2026-01-02', dayCount: 1 },
      { date: '2026-01-07', dayCount: 1 },
    ])
  })

  it('groups a run of flagged days into a single dot on a long axis', () => {
    const dates = axis(28)
    const flagged = ['2026-01-05', '2026-01-06', '2026-01-07', '2026-01-08']

    // 28 dates over 7 markers -> 4-date windows, so the whole run collapses.
    expect(booleanFlagMarkers(dates, flagged, 7)).toEqual([
      { date: '2026-01-05', dayCount: 4 },
    ])
  })

  it('never places two dots closer together than one window', () => {
    const dates = axis(24)
    // Adjacent days that straddle a fixed 4-date window boundary: a
    // bucket-by-index grouping would emit both, this must not.
    const markers = booleanFlagMarkers(dates, ['2026-01-08', '2026-01-09'], 6)

    expect(markers).toEqual([{ date: '2026-01-08', dayCount: 2 }])
  })

  it('caps the number of dots at maxMarkers', () => {
    const dates = axis(30)
    const markers = booleanFlagMarkers(dates, dates, 5)

    expect(markers.length).toBeLessThanOrEqual(5)
    expect(markers.reduce((sum, m) => sum + m.dayCount, 0)).toBe(30)
  })

  it('returns nothing when the flag was never on', () => {
    expect(booleanFlagMarkers(axis(10), [], 24)).toEqual([])
  })

  it('ignores flagged dates that are not on the axis', () => {
    expect(booleanFlagMarkers(axis(3), ['2026-05-01'], 24)).toEqual([])
  })
})

describe('numericSeriesValueByDate', () => {
  it('maps a plain per-entry field, skipping days without it (#336)', () => {
    const entries = [
      entry('2026-01-01', { weightKg: 80 }),
      entry('2026-01-02'), // no weight logged
      entry('2026-01-03', { weightKg: 81 }),
    ]

    const map = numericSeriesValueByDate(entries, 'weight')

    expect(map.get('2026-01-01')).toBe(80)
    expect(map.has('2026-01-02')).toBe(false)
    expect(map.get('2026-01-03')).toBe(81)
  })

  it('returns an empty map with no entries', () => {
    expect(numericSeriesValueByDate([], 'steps').size).toBe(0)
  })
})
