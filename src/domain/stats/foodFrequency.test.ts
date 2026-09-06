import { describe, expect, it } from 'vitest'
import type { CalorieItem, DailyEntry } from '@/domain/dailyEntry'
import { foodFrequencyTallies, mostEatenFoods } from './foodFrequency'

let idCounter = 0

function item(name: string | undefined, amountKcal = 100): CalorieItem {
  idCounter += 1
  return { id: `item-${idCounter}`, name, amountKcal }
}

function entry(date: string, items: CalorieItem[]): DailyEntry {
  idCounter += 1
  const now = '2026-01-01T00:00:00.000Z'
  return {
    id: `entry-${idCounter}`,
    date,
    calorieEntries: [{ id: `meal-${idCounter}`, items, createdAt: now }],
    createdAt: now,
    updatedAt: now,
  }
}

describe('foodFrequency (#812)', () => {
  it('skips unnamed items and ignores dayTotals', () => {
    const entries = [
      {
        ...entry('2026-09-01', [item(undefined, 500), item('Milk', 50)]),
        dayTotals: { amountKcal: 900 },
      },
    ]
    expect(foodFrequencyTallies(entries)).toEqual([
      { name: 'Milk', count: 1, kcal: 50 },
    ])
  })

  it('groups by trimmed name and counts each logged item', () => {
    const entries = [
      entry('2026-09-01', [item('Milk', 50), item(' Milk ', 50)]),
      entry('2026-09-02', [item('Napoleon', 400)]),
    ]
    expect(foodFrequencyTallies(entries)).toEqual([
      { name: 'Milk', count: 2, kcal: 100 },
      { name: 'Napoleon', count: 1, kcal: 400 },
    ])
  })

  it('ranks by times logged, ties broken by name', () => {
    const entries = [
      entry('2026-09-01', [item('Banana', 90), item('Apple', 80)]),
      entry('2026-09-02', [item('Banana', 90)]),
    ]
    expect(mostEatenFoods(entries).map((row) => row.name)).toEqual([
      'Banana',
      'Apple',
    ])
  })
})
