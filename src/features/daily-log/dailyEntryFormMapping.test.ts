import { describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import { entryToFormValues, formValuesToEntry } from './dailyEntryFormMapping'

function makeEntry(overrides: Partial<DailyEntry> = {}): DailyEntry {
  const now = '2026-03-01T00:00:00.000Z'
  return {
    id: 'entry-1',
    date: '2026-03-01',
    weightKg: 80,
    caloriesConsumed: 2000,
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
      caloriesConsumed: 2000,
      note: 'felt good',
    })
  })
})

describe('formValuesToEntry', () => {
  it('creates a new entry with a fresh id for a date with no existing entry', () => {
    const entry = formValuesToEntry(
      { weightKg: 80, caloriesConsumed: 2000 },
      '2026-03-01',
      null,
    )

    expect(entry.id).toBeTruthy()
    expect(entry.date).toBe('2026-03-01')
    expect(entry.weightKg).toBe(80)
    expect(entry.caloriesConsumed).toBe(2000)
  })

  it('preserves id and createdAt when editing an existing entry', () => {
    const existing = makeEntry({ id: 'existing-id' })
    const entry = formValuesToEntry(
      { weightKg: 79, caloriesConsumed: 1900 },
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
    expect(entry.caloriesConsumed).toBeUndefined()
  })
})
