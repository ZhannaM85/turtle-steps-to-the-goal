import { describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import {
  isBackfilledMealItemSource,
  normalizeMealLibraryName,
  planMealLibraryBackfill,
} from './mealLibraryBackfill'

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

describe('mealLibraryBackfill (#541)', () => {
  it('normalizes names for dedup', () => {
    expect(normalizeMealLibraryName('  Pizza   Margherita ')).toBe(
      'pizza margherita',
    )
  })

  it('keeps the most recent macros and skips existing library names', () => {
    const plan = planMealLibraryBackfill(
      [
        entry('2026-01-01', [{ name: 'Oats', amountKcal: 100, proteinG: 5 }]),
        entry('2026-02-01', [{ name: 'oats', amountKcal: 150, proteinG: 8 }]),
        entry('2026-02-02', [{ name: 'Coffee', amountKcal: 5 }]),
      ],
      [{ name: 'Coffee' }],
    )
    expect(plan.totalUniqueNamed).toBe(1)
    expect(plan.candidates).toEqual([
      { name: 'oats', amountKcal: 150, proteinG: 8 },
    ])
  })

  it('ignores nameless or zero-kcal items', () => {
    const plan = planMealLibraryBackfill(
      [
        entry('2026-01-01', [
          { amountKcal: 200 },
          { name: 'Water', amountKcal: 0 },
        ]),
      ],
      [],
    )
    expect(plan.candidates).toEqual([])
  })

  it('truncates when over the max', () => {
    const entries = Array.from({ length: 5 }, (_, i) =>
      entry(`2026-01-0${i + 1}`, [
        { name: `Food ${i}`, amountKcal: 100 + i },
      ]),
    )
    const plan = planMealLibraryBackfill(entries, [], 3)
    expect(plan.truncated).toBe(true)
    expect(plan.totalUniqueNamed).toBe(5)
    expect(plan.candidates).toHaveLength(3)
  })

  it('recognizes backfill sources for undo', () => {
    expect(isBackfilledMealItemSource('history-backfill')).toBe(true)
    expect(isBackfilledMealItemSource('mfp-import')).toBe(true)
    expect(isBackfilledMealItemSource(undefined)).toBe(false)
  })
})
