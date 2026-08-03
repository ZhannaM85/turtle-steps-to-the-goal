import { describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import {
  countMealLibraryNameMatches,
  propagateMealLibraryEdit,
} from './propagateMealLibraryEdit'

function entry(
  date: string,
  items: { name?: string; amountKcal: number; proteinG?: number }[],
): DailyEntry {
  const now = `${date}T12:00:00.000Z`
  return {
    id: date,
    date,
    calorieEntries: [
      {
        id: `meal-${date}`,
        items: items.map((item, i) => ({ id: `${date}-${i}`, ...item })),
        createdAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  }
}

describe('propagateMealLibraryEdit (#542)', () => {
  it('counts normalized name matches across days', () => {
    const entries = [
      entry('2026-01-01', [
        { name: 'Oats', amountKcal: 100, proteinG: 200 },
        { name: 'Coffee', amountKcal: 5 },
      ]),
      entry('2026-01-02', [{ name: 'oats', amountKcal: 120, proteinG: 200 }]),
    ]
    expect(countMealLibraryNameMatches(entries, 'OATS')).toBe(2)
    expect(countMealLibraryNameMatches(entries, 'Bagel')).toBe(0)
  })

  it('rewrites macros on matching lines and leaves others alone', () => {
    const entries = [
      entry('2026-01-01', [
        { name: 'Oats', amountKcal: 100, proteinG: 200 },
        { name: 'Coffee', amountKcal: 5 },
      ]),
    ]
    const result = propagateMealLibraryEdit(entries, {
      matchName: 'Oats',
      nutrition: { amountKcal: 150, proteinG: 8, fatG: 3, carbsG: 25 },
    })
    expect(result.updatedItemCount).toBe(1)
    expect(result.entriesToUpsert).toHaveLength(1)
    const items = result.entriesToUpsert[0]!.calorieEntries![0]!.items
    expect(items[0]).toMatchObject({
      name: 'Oats',
      amountKcal: 150,
      proteinG: 8,
      fatG: 3,
      carbsG: 25,
    })
    expect(items[1]).toMatchObject({ name: 'Coffee', amountKcal: 5 })
  })

  it('renames matching lines without changing macros when nutrition omitted', () => {
    const entries = [
      entry('2026-01-01', [{ name: 'Oats', amountKcal: 100, proteinG: 5 }]),
    ]
    const result = propagateMealLibraryEdit(entries, {
      matchName: 'Oats',
      newName: 'Oatmeal',
    })
    expect(result.updatedItemCount).toBe(1)
    expect(
      result.entriesToUpsert[0]!.calorieEntries![0]!.items[0],
    ).toMatchObject({
      name: 'Oatmeal',
      amountKcal: 100,
      proteinG: 5,
    })
  })

  it('returns nothing when there are no matches', () => {
    const entries = [entry('2026-01-01', [{ name: 'Coffee', amountKcal: 5 }])]
    const result = propagateMealLibraryEdit(entries, {
      matchName: 'Oats',
      nutrition: { amountKcal: 1 },
    })
    expect(result).toEqual({ entriesToUpsert: [], updatedItemCount: 0 })
  })
})
