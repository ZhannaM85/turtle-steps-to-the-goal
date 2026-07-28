import { describe, expect, it } from 'vitest'
import type { CalorieEntry, DailyEntry } from './DailyEntry'
import { hadNightEating } from './nightEating'

function meal(timeEaten?: string): CalorieEntry {
  return {
    id: crypto.randomUUID(),
    items: [{ id: crypto.randomUUID(), amountKcal: 400 }],
    timeEaten,
    createdAt: '2026-01-01T00:00:00.000Z',
  }
}

function entry(overrides: Partial<DailyEntry> = {}): DailyEntry {
  const now = '2026-01-01T00:00:00.000Z'
  return { id: 'e1', date: '2026-03-01', createdAt: now, updatedAt: now, ...overrides }
}

describe('hadNightEating', () => {
  it('is false with no meals logged at all', () => {
    expect(hadNightEating(entry())).toBe(false)
  })

  it('is false when every meal was eaten before the cutoff', () => {
    expect(
      hadNightEating(entry({ calorieEntries: [meal('08:00'), meal('19:30')] })),
    ).toBe(false)
  })

  it('is true when a meal was eaten at or after the 21:00 cutoff', () => {
    expect(
      hadNightEating(entry({ calorieEntries: [meal('08:00'), meal('21:00')] })),
    ).toBe(true)
    expect(
      hadNightEating(entry({ calorieEntries: [meal('23:15')] })),
    ).toBe(true)
  })

  it('ignores meals with no recorded time', () => {
    expect(hadNightEating(entry({ calorieEntries: [meal(undefined)] }))).toBe(
      false,
    )
  })

  it('lets a manual override win over the derived value, either direction', () => {
    expect(
      hadNightEating(
        entry({
          calorieEntries: [meal('23:00')],
          nightEatingOverride: false,
        }),
      ),
    ).toBe(false)
    expect(
      hadNightEating(
        entry({
          calorieEntries: [meal('08:00')],
          nightEatingOverride: true,
        }),
      ),
    ).toBe(true)
  })
})
