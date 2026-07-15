import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { beforeAll, describe, expect, it } from 'vitest'
import { db } from './db'

const DB_NAME = 'turtle-steps-to-the-goal'

// Simulates an existing v1-only install: write directly with a v1-schema
// Dexie instance (bypassing the app's own v1+v2 db), close it, then let the
// app's real `db` open the same physical database in the tests below — that
// first open is what triggers the v1 -> v2 .upgrade() migration. Done once
// in beforeAll rather than per-test, since Dexie only runs a version's
// .upgrade() once per physical database.
beforeAll(async () => {
  const legacyDb = new Dexie(DB_NAME)
  legacyDb.version(1).stores({
    goals: 'id, createdAt',
    dailyEntries: 'id, &date',
  })
  await legacyDb.table('dailyEntries').bulkPut([
    {
      id: 'legacy-1',
      date: '2026-01-01',
      caloriesConsumed: 1600,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'legacy-2',
      date: '2026-01-02',
      weightKg: 80,
      createdAt: '2026-01-02T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    },
    {
      id: 'legacy-3',
      date: '2026-01-03',
      // Already itemized (skips the v1->v2 caloriesConsumed wrap) but with
      // an old-format meal emotion from before #54 — this is what the
      // v3->v4 .upgrade() below needs to clear.
      calorieEntries: [
        {
          id: 'legacy-meal-1',
          amountKcal: 500,
          emotion: 'happy',
          createdAt: '2026-01-03T00:00:00.000Z',
        },
      ],
      emotion: 'unhappy',
      createdAt: '2026-01-03T00:00:00.000Z',
      updatedAt: '2026-01-03T00:00:00.000Z',
    },
  ])
  legacyDb.close()
})

describe('AppDatabase v1 -> v2 migration', () => {
  it('collapses a legacy caloriesConsumed number into calorieEntries', async () => {
    const migrated = await db.dailyEntries.get('legacy-1')

    expect(migrated).not.toHaveProperty('caloriesConsumed')
    expect(migrated?.calorieEntries).toEqual([
      {
        id: expect.any(String),
        amountKcal: 1600,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ])
  })

  it('leaves an entry with no calories logged untouched', async () => {
    const migrated = await db.dailyEntries.get('legacy-2')

    expect(migrated?.calorieEntries).toBeUndefined()
    expect(migrated?.weightKg).toBe(80)
  })
})

describe('AppDatabase v3 -> v4 migration', () => {
  it('clears an old-format meal emotion, leaving the day emotion untouched', async () => {
    const migrated = await db.dailyEntries.get('legacy-3')

    expect(migrated?.calorieEntries?.[0]).not.toHaveProperty('emotion')
    expect(migrated?.calorieEntries?.[0].amountKcal).toBe(500)
    expect(migrated?.emotion).toBe('unhappy')
  })
})
