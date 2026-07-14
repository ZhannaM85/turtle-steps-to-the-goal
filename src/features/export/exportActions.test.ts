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
      { id: crypto.randomUUID(), amountKcal: 2000, createdAt: now },
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
      version: 3,
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
      version: 3,
      exportedAt: '2026-01-01',
      goals: [],
      dailyEntries: [],
    }
    expect(parseExportBundle(bundle)).toEqual(bundle)
  })

  it('upgrades a legacy v2 backup (single caloriesConsumed number) into calorieEntries', () => {
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

    expect(upgraded.version).toBe(3)
    expect(upgraded.dailyEntries[0]).not.toHaveProperty('caloriesConsumed')
    expect(upgraded.dailyEntries[0].calorieEntries).toEqual([
      {
        id: expect.any(String),
        amountKcal: 1600,
        createdAt: '2026-03-01T00:00:00.000Z',
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
