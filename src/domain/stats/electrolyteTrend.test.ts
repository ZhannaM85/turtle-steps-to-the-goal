import { describe, expect, it } from 'vitest'
import type { CalorieEntry, CalorieItem, DailyEntry } from '@/domain/dailyEntry'
import { electrolytePoints } from './electrolyteTrend'

let idCounter = 0

function item(overrides: Partial<CalorieItem> = {}): CalorieItem {
  return {
    id: crypto.randomUUID(),
    amountKcal: 100,
    ...overrides,
  }
}

function meal(...items: CalorieItem[]): CalorieEntry {
  return {
    id: crypto.randomUUID(),
    items,
    createdAt: '2026-01-01T00:00:00.000Z',
  }
}

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

describe('electrolytePoints', () => {
  it('returns nothing for no entries', () => {
    expect(electrolytePoints([])).toEqual([])
  })

  it('excludes a day with no electrolyte totals', () => {
    const entries = [
      entry('2026-03-01', {
        calorieEntries: [meal(item({ proteinG: 10 }))],
      }),
      entry('2026-03-02', {
        calorieEntries: [meal(item({ sodiumMg: 200 }))],
      }),
    ]

    const points = electrolytePoints(entries)

    expect(points).toHaveLength(1)
    expect(points[0].date).toBe('2026-03-02')
    expect(points[0].raw.sodium).toBe(200)
  })

  it('normalizes each electrolyte series independently', () => {
    const entries = [
      entry('2026-03-01', {
        calorieEntries: [
          meal(item({ sodiumMg: 100, magnesiumMg: 20 })),
        ],
      }),
      entry('2026-03-02', {
        calorieEntries: [
          meal(item({ sodiumMg: 200, magnesiumMg: 30 })),
        ],
      }),
      entry('2026-03-03', {
        calorieEntries: [
          meal(item({ sodiumMg: 300, magnesiumMg: 40 })),
        ],
      }),
    ]

    const points = electrolytePoints(entries)

    expect(points[0].normalized.sodium).toBe(0)
    expect(points[1].normalized.sodium).toBe(50)
    expect(points[2].normalized.sodium).toBe(100)
    expect(points[0].normalized.magnesium).toBe(0)
    expect(points[2].normalized.magnesium).toBe(100)
  })
})
