import { describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import { filterPatchesToFields, mergeDailyEntryPatches } from './mergeDailyEntryPatches'
import type { DailyEntryPatch } from './mergeDailyEntryPatches'

function makeEntry(overrides: Partial<DailyEntry> = {}): DailyEntry {
  const now = '2026-01-10T00:00:00.000Z'
  return {
    id: 'existing-1',
    date: '2026-01-15',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

describe('mergeDailyEntryPatches', () => {
  it('creates a brand-new entry for a date with no existing DailyEntry', () => {
    const patches = new Map<string, DailyEntryPatch>([
      ['2026-01-15', { weightKg: 60 }],
    ])

    const result = mergeDailyEntryPatches(patches, [])

    expect(result.daysImported).toBe(1)
    expect(result.daysUpdated).toBe(0)
    expect(result.entriesToUpsert).toHaveLength(1)
    expect(result.entriesToUpsert[0]).toMatchObject({
      date: '2026-01-15',
      weightKg: 60,
    })
  })

  it('overwrites just the patched fields on an existing entry, wins on conflict', () => {
    const existing = makeEntry({
      weightKg: 59, // will be overwritten by the imported value
      note: 'Felt great today', // must survive the merge untouched
      steps: 1000, // not part of this patch — must survive untouched
    })
    const patches = new Map<string, DailyEntryPatch>([
      ['2026-01-15', { weightKg: 61.4, bodyFatPercent: 22 }],
    ])

    const result = mergeDailyEntryPatches(patches, [existing])

    expect(result.daysUpdated).toBe(1)
    expect(result.entriesToUpsert[0]).toMatchObject({
      id: 'existing-1',
      date: '2026-01-15',
      weightKg: 61.4, // imported value wins
      bodyFatPercent: 22,
      note: 'Felt great today', // untouched
      steps: 1000, // untouched — not in this patch
    })
  })

  describe('calorieEntries (#367)', () => {
    it('appends imported meals alongside an existing entry\'s meals, rather than replacing them', () => {
      const existing = makeEntry({
        calorieEntries: [
          {
            id: 'hand-logged',
            items: [{ id: 'i1', name: 'Homemade soup', amountKcal: 250 }],
            createdAt: '2026-01-15T08:00:00.000Z',
          },
        ],
      })
      const patches = new Map<string, DailyEntryPatch>([
        [
          '2026-01-15',
          {
            calorieEntries: [
              {
                id: 'imported-1',
                items: [{ id: 'i2', name: 'Oatmeal', amountKcal: 300 }],
                createdAt: '2026-01-15T12:00:00.000Z',
              },
            ],
          },
        ],
      ])

      const result = mergeDailyEntryPatches(patches, [existing])

      expect(result.entriesToUpsert[0].calorieEntries).toHaveLength(2)
      expect(result.entriesToUpsert[0].calorieEntries?.[0].id).toBe(
        'hand-logged',
      )
      expect(result.entriesToUpsert[0].calorieEntries?.[1].id).toBe(
        'imported-1',
      )
    })

    it('just sets calorieEntries directly for a brand-new entry with none to merge with', () => {
      const patches = new Map<string, DailyEntryPatch>([
        [
          '2026-01-15',
          {
            calorieEntries: [
              {
                id: 'imported-1',
                items: [{ id: 'i1', name: 'Oatmeal', amountKcal: 300 }],
                createdAt: '2026-01-15T12:00:00.000Z',
              },
            ],
          },
        ],
      ])

      const result = mergeDailyEntryPatches(patches, [])

      expect(result.entriesToUpsert[0].calorieEntries).toHaveLength(1)
    })

    it("leaves an existing entry's meals untouched when the patch has no calorieEntries at all", () => {
      const existing = makeEntry({
        calorieEntries: [
          {
            id: 'hand-logged',
            items: [{ id: 'i1', name: 'Homemade soup', amountKcal: 250 }],
            createdAt: '2026-01-15T08:00:00.000Z',
          },
        ],
      })
      const patches = new Map<string, DailyEntryPatch>([
        ['2026-01-15', { weightKg: 60 }],
      ])

      const result = mergeDailyEntryPatches(patches, [existing])

      expect(result.entriesToUpsert[0].calorieEntries).toHaveLength(1)
      expect(result.entriesToUpsert[0].calorieEntries?.[0].id).toBe(
        'hand-logged',
      )
    })
  })

  it('counts days imported vs. days that already had an entry independently', () => {
    const patches = new Map<string, DailyEntryPatch>([
      ['2026-01-14', { weightKg: 59 }],
      ['2026-01-15', { weightKg: 60 }],
    ])
    const existing = [makeEntry({ id: 'existing-1', date: '2026-01-15' })]

    const result = mergeDailyEntryPatches(patches, existing)

    expect(result.daysImported).toBe(2)
    expect(result.daysUpdated).toBe(1)
  })
})

describe('filterPatchesToFields (#369)', () => {
  it('drops fields not in the included set, keeping the rest', () => {
    const patches = new Map<string, DailyEntryPatch>([
      ['2026-01-15', { weightKg: 60, steps: 8000, bodyFatPercent: 22 }],
    ])

    const filtered = filterPatchesToFields(patches, new Set(['steps']))

    expect(filtered.get('2026-01-15')).toEqual({ steps: 8000 })
  })

  it('drops a date entirely once none of its fields are included', () => {
    const patches = new Map<string, DailyEntryPatch>([
      ['2026-01-14', { weightKg: 59 }],
      ['2026-01-15', { steps: 8000 }],
    ])

    const filtered = filterPatchesToFields(patches, new Set(['steps']))

    expect(filtered.has('2026-01-14')).toBe(false)
    expect(filtered.has('2026-01-15')).toBe(true)
  })

  it('keeps everything when every field is included', () => {
    const patches = new Map<string, DailyEntryPatch>([
      ['2026-01-15', { weightKg: 60, steps: 8000 }],
    ])

    const filtered = filterPatchesToFields(
      patches,
      new Set(['weightKg', 'steps']),
    )

    expect(filtered.get('2026-01-15')).toEqual({ weightKg: 60, steps: 8000 })
  })
})
