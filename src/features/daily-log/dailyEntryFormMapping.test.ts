import { describe, expect, it } from 'vitest'
import type { CalorieEntry, DailyEntry } from '@/domain/dailyEntry'
import { entryToFormValues, formValuesToEntry } from './dailyEntryFormMapping'

const calorieEntries: CalorieEntry[] = [
  { id: 'calorie-1', amountKcal: 2000, createdAt: '2026-03-01T00:00:00.000Z' },
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
  it('creates a new entry with a fresh id for a date with no existing entry', () => {
    const entry = formValuesToEntry(
      { weightKg: 80, calorieEntries },
      '2026-03-01',
      null,
    )

    expect(entry.id).toBeTruthy()
    expect(entry.date).toBe('2026-03-01')
    expect(entry.weightKg).toBe(80)
    expect(entry.calorieEntries).toEqual(calorieEntries)
  })

  it('preserves id and createdAt when editing an existing entry', () => {
    const existing = makeEntry({ id: 'existing-id' })
    const entry = formValuesToEntry(
      { weightKg: 79, calorieEntries },
      '2026-03-01',
      existing,
    )

    expect(entry.id).toBe('existing-id')
    expect(entry.createdAt).toBe(existing.createdAt)
    expect(entry.weightKg).toBe(79)
  })

  it('allows either field to be omitted (partial daily entries)', () => {
    const entry = formValuesToEntry({ weightKg: 80 }, '2026-03-01', null)

    expect(entry.weightKg).toBe(80)
    expect(entry.calorieEntries).toBeUndefined()
  })
})
