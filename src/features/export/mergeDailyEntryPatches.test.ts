import { describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import { mergeDailyEntryPatches } from './mergeDailyEntryPatches'
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
