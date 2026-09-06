import { describe, expect, it } from 'vitest'
import type { CalorieItem, DailyEntry } from '@/domain/dailyEntry'
import {
  mealTimeBucket,
  mealTimeBucketTallies,
} from './mealTimeBuckets'

let idCounter = 0

function item(): CalorieItem {
  idCounter += 1
  return { id: `item-${idCounter}`, name: 'Tea', amountKcal: 10 }
}

function entry(
  date: string,
  timeEaten: string | undefined,
): DailyEntry {
  idCounter += 1
  const now = `${date}T00:00:00.000Z`
  return {
    id: `entry-${idCounter}`,
    date,
    calorieEntries: [
      {
        id: `meal-${idCounter}`,
        items: [item()],
        createdAt: now,
        timeEaten,
      },
    ],
    createdAt: now,
    updatedAt: now,
  }
}

describe('mealTimeBucket (#815)', () => {
  it('splits clock times into four buckets, night wrapping past midnight', () => {
    expect(mealTimeBucket('05:00')).toBe('morning')
    expect(mealTimeBucket('11:59')).toBe('morning')
    expect(mealTimeBucket('12:00')).toBe('afternoon')
    expect(mealTimeBucket('16:59')).toBe('afternoon')
    expect(mealTimeBucket('17:00')).toBe('evening')
    expect(mealTimeBucket('22:59')).toBe('evening')
    expect(mealTimeBucket('23:00')).toBe('night')
    expect(mealTimeBucket('04:59')).toBe('night')
  })

  it('counts timed meals and skips untimed ones', () => {
    const result = mealTimeBucketTallies([
      entry('2026-09-01', '08:00'),
      entry('2026-09-01', '13:00'),
      entry('2026-09-01', '19:00'),
      entry('2026-09-01', '23:30'),
      entry('2026-09-01', undefined),
    ])
    expect(result.missingTimeCount).toBe(1)
    expect(result.buckets).toEqual([
      { bucket: 'morning', count: 1 },
      { bucket: 'afternoon', count: 1 },
      { bucket: 'evening', count: 1 },
      { bucket: 'night', count: 1 },
    ])
  })
})
