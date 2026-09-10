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

  it('maps body measurements (#225)', () => {
    expect(
      entryToFormValues(
        makeEntry({ waistCm: 80, hipCm: 95, bodyFatPercent: 22 }),
      ),
    ).toMatchObject({ waistCm: 80, hipCm: 95, bodyFatPercent: 22 })
  })

  it('maps a morning note (#763)', () => {
    expect(
      entryToFormValues(makeEntry({ morningNote: 'night snack' })),
    ).toMatchObject({ morningNote: 'night snack' })
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

  it('round-trips body measurements (#225)', () => {
    const entry = formValuesToEntry(
      { waistCm: 80, hipCm: 95, bodyFatPercent: 22 },
      '2026-03-01',
      { id: 'entry-1', createdAt: '2026-03-01T00:00:00.000Z' },
    )

    expect(entry.waistCm).toBe(80)
    expect(entry.hipCm).toBe(95)
    expect(entry.bodyFatPercent).toBe(22)
  })

  it('round-trips nightEatingOverride (#383)', () => {
    const entry = formValuesToEntry(
      { nightEatingOverride: true },
      '2026-03-01',
      { id: 'entry-1', createdAt: '2026-03-01T00:00:00.000Z' },
    )

    expect(entry.nightEatingOverride).toBe(true)
  })

  it('round-trips night food remember and reason (#818)', () => {
    const entry = formValuesToEntry(
      {
        nightEatingOverride: true,
        nightEatingRemember: 'partial',
        nightEatingReason: 'could not sleep',
      },
      '2026-03-01',
      { id: 'entry-1', createdAt: '2026-03-01T00:00:00.000Z' },
    )

    expect(entry.nightEatingRemember).toBe('partial')
    expect(entry.nightEatingReason).toBe('could not sleep')
    expect(entryToFormValues(entry).nightEatingRemember).toBe('partial')
    expect(entryToFormValues(entry).nightEatingReason).toBe('could not sleep')
  })

  it('round-trips night food No-path easy and what helped (#842)', () => {
    const entry = formValuesToEntry(
      {
        nightEatingOverride: false,
        nightEatingNoEasy: true,
        nightEatingNoWhatHelped: 'tea helped',
      },
      '2026-03-01',
      { id: 'entry-1', createdAt: '2026-03-01T00:00:00.000Z' },
    )

    expect(entry.nightEatingNoEasy).toBe(true)
    expect(entry.nightEatingNoWhatHelped).toBe('tea helped')
    expect(entry.nightEatingNoThoughts).toBeUndefined()
    expect(entryToFormValues(entry).nightEatingNoEasy).toBe(true)
    expect(entryToFormValues(entry).nightEatingNoWhatHelped).toBe('tea helped')
  })

  it('preserves historical thoughts under the old key and does not migrate them (#842)', () => {
    const entry = formValuesToEntry(
      {
        nightEatingOverride: false,
        nightEatingNoWhatHelped: 'walked',
      },
      '2026-03-01',
      { id: 'entry-1', createdAt: '2026-03-01T00:00:00.000Z' },
      { nightEatingNoThoughts: 'tea helped' },
    )

    expect(entry.nightEatingNoWhatHelped).toBe('walked')
    expect(entry.nightEatingNoThoughts).toBe('tea helped')
    expect(entryToFormValues(entry).nightEatingNoWhatHelped).toBe('walked')
    expect(
      Object.prototype.hasOwnProperty.call(
        entryToFormValues(entry),
        'nightEatingNoThoughts',
      ),
    ).toBe(false)
  })
})
