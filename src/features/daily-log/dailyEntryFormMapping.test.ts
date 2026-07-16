import { describe, expect, it } from 'vitest'
import type { CalorieEntry, DailyEntry } from '@/domain/dailyEntry'
import { entryToFormValues, formValuesToEntry } from './dailyEntryFormMapping'

const calorieEntries: CalorieEntry[] = [
  {
    id: 'calorie-1',
    items: [{ id: 'item-1', amountKcal: 2000 }],
    createdAt: '2026-03-01T00:00:00.000Z',
  },
]

function makeEntry(overrides: Partial<DailyEntry> = {}): DailyEntry {
  const now = '2026-03-01T00:00:00.000Z'
  return {
    id: 'entry-1',
    date: '2026-03-01',
    weightKg: 80,
    calorieEntries,
    note: 'felt good',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

describe('entryToFormValues', () => {
  it('returns an empty object when there is no existing entry', () => {
    expect(entryToFormValues(null)).toEqual({})
  })

  it('maps an existing entry straight through', () => {
    expect(entryToFormValues(makeEntry())).toEqual({
      weightKg: 80,
      calorieEntries,
      note: 'felt good',
    })
  })
})

describe('formValuesToEntry', () => {
  it('builds an entry using the given identity', () => {
    const entry = formValuesToEntry(
      { weightKg: 80, calorieEntries },
      '2026-03-01',
      { id: 'entry-1', createdAt: '2026-03-01T00:00:00.000Z' },
    )

    expect(entry.id).toBe('entry-1')
    expect(entry.date).toBe('2026-03-01')
    expect(entry.weightKg).toBe(80)
    expect(entry.calorieEntries).toEqual(calorieEntries)
    expect(entry.createdAt).toBe('2026-03-01T00:00:00.000Z')
  })

  it('always stamps a fresh updatedAt', () => {
    const entry = formValuesToEntry({ weightKg: 79 }, '2026-03-01', {
      id: 'entry-1',
      createdAt: '2026-03-01T00:00:00.000Z',
    })

    expect(() => new Date(entry.updatedAt).toISOString()).not.toThrow()
  })

  it('allows fields to be omitted (partial daily entries)', () => {
    const entry = formValuesToEntry({ weightKg: 80 }, '2026-03-01', {
      id: 'entry-1',
      createdAt: '2026-03-01T00:00:00.000Z',
    })

    expect(entry.weightKg).toBe(80)
    expect(entry.calorieEntries).toBeUndefined()
  })
})
