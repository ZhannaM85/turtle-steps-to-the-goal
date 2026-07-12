import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import type { Goal } from '@/domain/goal'
import { db } from './db'
import { IndexedDbGoalRepository } from './goalRepository'
import { IndexedDbDailyEntryRepository } from './dailyEntryRepository'

const goalRepository = new IndexedDbGoalRepository()
const dailyEntryRepository = new IndexedDbDailyEntryRepository()

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    targetWeeklyLossKg: 1,
    displayUnit: 'kg',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function makeEntry(overrides: Partial<DailyEntry> = {}): DailyEntry {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    date: '2026-01-01',
    weightKg: 80,
    caloriesConsumed: 2000,
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

describe('IndexedDbGoalRepository', () => {
  it('returns undefined when there is no active goal', async () => {
    await expect(goalRepository.getActiveGoal()).resolves.toBeUndefined()
  })

  it('saves and retrieves the most recently created goal as active', async () => {
    const older = makeGoal({ createdAt: '2026-01-01T00:00:00.000Z' })
    const newer = makeGoal({ createdAt: '2026-02-01T00:00:00.000Z' })
    await goalRepository.saveGoal(older)
    await goalRepository.saveGoal(newer)

    const active = await goalRepository.getActiveGoal()
    expect(active?.id).toBe(newer.id)
  })

  it('returns all goals for export/history purposes', async () => {
    const older = makeGoal({ createdAt: '2026-01-01T00:00:00.000Z' })
    const newer = makeGoal({ createdAt: '2026-02-01T00:00:00.000Z' })
    await goalRepository.saveGoal(older)
    await goalRepository.saveGoal(newer)

    const all = await goalRepository.getAll()
    expect(all.map((g) => g.id).sort()).toEqual([older.id, newer.id].sort())
  })
})

describe('IndexedDbDailyEntryRepository', () => {
  it('upserts and reads an entry back by date', async () => {
    const entry = makeEntry({ date: '2026-03-01' })
    await dailyEntryRepository.upsert(entry)

    const found = await dailyEntryRepository.getByDate('2026-03-01')
    expect(found).toEqual(entry)
  })

  it('enforces one entry per date', async () => {
    await dailyEntryRepository.upsert(makeEntry({ date: '2026-03-01' }))
    await expect(
      dailyEntryRepository.upsert(makeEntry({ date: '2026-03-01' })),
    ).rejects.toThrow()
  })

  it('updates an existing entry in place when upserting by the same id', async () => {
    const entry = makeEntry({ date: '2026-03-01', weightKg: 80 })
    await dailyEntryRepository.upsert(entry)
    await dailyEntryRepository.upsert({ ...entry, weightKg: 79.5 })

    const all = await dailyEntryRepository.getAll()
    expect(all).toHaveLength(1)
    expect(all[0].weightKg).toBe(79.5)
  })

  it('returns entries within an inclusive date range, sorted by date', async () => {
    await dailyEntryRepository.upsert(makeEntry({ date: '2026-03-03' }))
    await dailyEntryRepository.upsert(makeEntry({ date: '2026-03-01' }))
    await dailyEntryRepository.upsert(makeEntry({ date: '2026-03-05' }))

    const range = await dailyEntryRepository.getRange(
      '2026-03-01',
      '2026-03-03',
    )
    expect(range.map((e) => e.date)).toEqual(['2026-03-01', '2026-03-03'])
  })

  it('deletes an entry by id', async () => {
    const entry = makeEntry({ date: '2026-03-01' })
    await dailyEntryRepository.upsert(entry)
    await dailyEntryRepository.delete(entry.id)

    await expect(dailyEntryRepository.getAll()).resolves.toEqual([])
  })

  it('returns undefined for the earliest date when there are no entries', async () => {
    await expect(
      dailyEntryRepository.getEarliestDate(),
    ).resolves.toBeUndefined()
  })

  it('returns the earliest date regardless of insertion order', async () => {
    await dailyEntryRepository.upsert(makeEntry({ date: '2026-03-05' }))
    await dailyEntryRepository.upsert(makeEntry({ date: '2026-03-01' }))
    await dailyEntryRepository.upsert(makeEntry({ date: '2026-03-03' }))

    await expect(dailyEntryRepository.getEarliestDate()).resolves.toBe(
      '2026-03-01',
    )
  })
})
