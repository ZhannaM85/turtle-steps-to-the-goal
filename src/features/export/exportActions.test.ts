import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import type { Goal } from '@/domain/goal'
import { db } from '@/infrastructure/persistence/indexeddb'
import {
  exportAllData,
  importAllData,
  InvalidBackupFileError,
  parseExportBundle,
} from './exportActions'

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    targetWeeklyLossKg: 1,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function makeEntry(overrides: Partial<DailyEntry> = {}): DailyEntry {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    date: '2026-03-01',
    weightKg: 80,
    calorieEntries: [
      {
        id: crypto.randomUUID(),
        items: [{ id: crypto.randomUUID(), amountKcal: 2000 }],
        createdAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

beforeEach(async () => {
  await db.goals.clear()
  await db.dailyEntries.clear()
})

afterEach(async () => {
  await db.goals.clear()
  await db.dailyEntries.clear()
})

describe('exportAllData', () => {
  it('exports an empty bundle when there is no data', async () => {
    const bundle = await exportAllData()
    expect(bundle.goals).toEqual([])
    expect(bundle.dailyEntries).toEqual([])
  })

  it('exports all goals and entries currently stored', async () => {
    const goal = makeGoal()
    const entry = makeEntry()
    await db.goals.put(goal)
    await db.dailyEntries.put(entry)

    const bundle = await exportAllData()
    expect(bundle.goals).toEqual([goal])
    expect(bundle.dailyEntries).toEqual([entry])
  })
})

describe('importAllData', () => {
  it('round-trips an export back into an empty database', async () => {
    const goal = makeGoal()
    const entry = makeEntry()
    await db.goals.put(goal)
    await db.dailyEntries.put(entry)
    const bundle = await exportAllData()

    await db.goals.clear()
    await db.dailyEntries.clear()

    await importAllData(bundle)

    expect(await db.goals.toArray()).toEqual([goal])
    expect(await db.dailyEntries.toArray()).toEqual([entry])
  })

  it('merges into existing data instead of wiping it', async () => {
    const existingEntry = makeEntry({ date: '2026-03-02' })
    await db.dailyEntries.put(existingEntry)

    const backupEntry = makeEntry({ date: '2026-03-01' })
    await importAllData({
      version: 5,
      exportedAt: new Date().toISOString(),
      goals: [],
      dailyEntries: [backupEntry],
    })

    const all = await db.dailyEntries.toArray()
    expect(all).toHaveLength(2)
    expect(all.map((e) => e.date).sort()).toEqual(['2026-03-01', '2026-03-02'])
  })
})

describe('parseExportBundle', () => {
  it('parses a valid bundle', () => {
    const bundle = {
      version: 5,
      exportedAt: '2026-01-01',
      goals: [],
      dailyEntries: [],
    }
    expect(parseExportBundle(bundle)).toEqual(bundle)
  })

  it('upgrades a v4 backup by folding flat meals into single-item groups (#81)', () => {
    const v4Bundle = {
      version: 4,
      exportedAt: '2026-01-01',
      goals: [],
      dailyEntries: [
        {
          id: 'entry-1',
          date: '2026-03-01',
          weightKg: 80,
          calorieEntries: [
            {
              id: 'meal-1',
              amountKcal: 500,
              note: 'Pizza',
              proteinG: 20,
              createdAt: '2026-03-01T00:00:00.000Z',
            },
          ],
          createdAt: '2026-03-01T00:00:00.000Z',
          updatedAt: '2026-03-01T00:00:00.000Z',
        },
      ],
    }

    const upgraded = parseExportBundle(v4Bundle)

    expect(upgraded.version).toBe(5)
    const group = upgraded.dailyEntries[0].calorieEntries?.[0]
    expect(group?.id).toBe('meal-1')
    expect(group).not.toHaveProperty('note')
    expect(group?.items).toEqual([
      {
        id: expect.any(String),
        name: 'Pizza',
        amountKcal: 500,
        proteinG: 20,
        fatG: undefined,
        carbsG: undefined,
      },
    ])
  })

  it('upgrades a v3 backup by clearing old-format meal emotions (#54) and folding into groups (#81)', () => {
    const v3Bundle = {
      version: 3,
      exportedAt: '2026-01-01',
      goals: [],
      dailyEntries: [
        {
          id: 'entry-1',
          date: '2026-03-01',
          weightKg: 80,
          calorieEntries: [
            {
              id: 'meal-1',
              amountKcal: 500,
              note: 'Pizza',
              emotion: 'happy',
              createdAt: '2026-03-01T00:00:00.000Z',
            },
          ],
          emotion: 'happy',
          createdAt: '2026-03-01T00:00:00.000Z',
          updatedAt: '2026-03-01T00:00:00.000Z',
        },
      ],
    }

    const upgraded = parseExportBundle(v3Bundle)

    expect(upgraded.version).toBe(5)
    const group = upgraded.dailyEntries[0].calorieEntries?.[0]
    // Meal-level emotion is cleared, not translated.
    expect(group?.emotion).toBeUndefined()
    expect(group?.items[0].name).toBe('Pizza')
    expect(group?.items[0].amountKcal).toBe(500)
    // Day-level emotion is untouched — that set didn't change.
    expect(upgraded.dailyEntries[0].emotion).toBe('happy')
  })

  it('upgrades a legacy v2 backup (single caloriesConsumed number) into a single-item group', () => {
    const legacyBundle = {
      version: 2,
      exportedAt: '2026-01-01',
      goals: [],
      dailyEntries: [
        {
          id: 'entry-1',
          date: '2026-03-01',
          weightKg: 80,
          caloriesConsumed: 1600,
          createdAt: '2026-03-01T00:00:00.000Z',
          updatedAt: '2026-03-01T00:00:00.000Z',
        },
      ],
    }

    const upgraded = parseExportBundle(legacyBundle)

    expect(upgraded.version).toBe(5)
    expect(upgraded.dailyEntries[0]).not.toHaveProperty('caloriesConsumed')
    const group = upgraded.dailyEntries[0].calorieEntries?.[0]
    expect(group?.items).toEqual([
      {
        id: expect.any(String),
        name: undefined,
        amountKcal: 1600,
        proteinG: undefined,
        fatG: undefined,
        carbsG: undefined,
      },
    ])
  })

  it('upgrades a legacy v2 entry with no calories logged, leaving calorieEntries undefined', () => {
    const legacyBundle = {
      version: 2,
      exportedAt: '2026-01-01',
      goals: [],
      dailyEntries: [
        {
          id: 'entry-1',
          date: '2026-03-01',
          weightKg: 80,
          createdAt: '2026-03-01T00:00:00.000Z',
          updatedAt: '2026-03-01T00:00:00.000Z',
        },
      ],
    }

    const upgraded = parseExportBundle(legacyBundle)

    expect(upgraded.dailyEntries[0].calorieEntries).toBeUndefined()
  })

  it('throws InvalidBackupFileError for malformed JSON content', () => {
    expect(() => parseExportBundle({ not: 'a backup' })).toThrow(
      InvalidBackupFileError,
    )
  })
})
