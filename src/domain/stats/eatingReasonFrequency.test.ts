import { describe, expect, it } from 'vitest'
import type { CalorieItem, DailyEntry } from '@/domain/dailyEntry'
import { eatingReasonTallies } from './eatingReasonFrequency'

let idCounter = 0

function item(): CalorieItem {
  idCounter += 1
  return { id: `item-${idCounter}`, name: 'Tea', amountKcal: 10 }
}

function entry(
  date: string,
  reasons: { eatingReason?: string; eatingReasons?: string[] },
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
        ...reasons,
      },
    ],
    createdAt: now,
    updatedAt: now,
  }
}

describe('eatingReasonTallies (#814)', () => {
  it('ignores meals with no reason', () => {
    expect(eatingReasonTallies([entry('2026-09-01', {})])).toEqual([])
  })

  it('counts a legacy single eatingReason', () => {
    expect(
      eatingReasonTallies([entry('2026-09-01', { eatingReason: 'hunger' })]),
    ).toEqual([{ reason: 'hunger', count: 1 }])
  })

  it('increments each selected reason on a multi-pick meal', () => {
    const tallies = eatingReasonTallies([
      entry('2026-09-01', { eatingReasons: ['hunger', 'habit'] }),
      entry('2026-09-02', { eatingReason: 'habit' }),
    ])
    expect(tallies).toEqual([
      { reason: 'habit', count: 2 },
      { reason: 'hunger', count: 1 },
    ])
  })
})
