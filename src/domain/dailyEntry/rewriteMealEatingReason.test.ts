import { describe, expect, it } from 'vitest'
import type { DailyEntry } from './DailyEntry'
import { rewriteMealEatingReason } from './rewriteMealEatingReason'

function makeEntry(overrides: Partial<DailyEntry> = {}): DailyEntry {
  const now = '2026-03-01T00:00:00.000Z'
  return {
    id: 'entry-1',
    date: '2026-03-01',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

describe('rewriteMealEatingReason (#767)', () => {
  it('rewrites matching custom reasons and leaves other meals alone', () => {
    const entry = makeEntry({
      calorieEntries: [
        {
          id: 'm1',
          items: [{ id: 'i1', amountKcal: 100 }],
          eatingReason: 'Tired after work',
          createdAt: '2026-03-01T00:00:00.000Z',
        },
        {
          id: 'm2',
          items: [{ id: 'i2', amountKcal: 200 }],
          eatingReason: 'hunger',
          createdAt: '2026-03-01T00:00:00.000Z',
        },
      ],
    })

    const changed = rewriteMealEatingReason(
      [entry],
      'Tired after work',
      'Just wanted something tasty',
    )

    expect(changed).toHaveLength(1)
    expect(changed[0].calorieEntries?.[0].eatingReason).toBe(
      'Just wanted something tasty',
    )
    expect(changed[0].calorieEntries?.[1].eatingReason).toBe('hunger')
  })

  it('returns nothing when no meal uses the old label', () => {
    const entry = makeEntry({
      calorieEntries: [
        {
          id: 'm1',
          items: [{ id: 'i1', amountKcal: 100 }],
          eatingReason: 'hunger',
          createdAt: '2026-03-01T00:00:00.000Z',
        },
      ],
    })

    expect(
      rewriteMealEatingReason([entry], 'Tired after work', 'Other'),
    ).toEqual([])
  })
})
