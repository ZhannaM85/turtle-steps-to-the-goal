import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import { db } from '@/infrastructure/persistence/indexeddb'
import { useDailyEntryStore } from './dailyEntryStore'

function makeEntry(overrides: Partial<DailyEntry> = {}): DailyEntry {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    date: '2026-03-01',
    weightKg: 80,
    caloriesConsumed: 2000,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

beforeEach(async () => {
  await db.dailyEntries.clear()
  useDailyEntryStore.setState({
    date: null,
    entry: null,
    status: 'idle',
    error: null,
  })
})

afterEach(async () => {
  await db.dailyEntries.clear()
})

describe('useDailyEntryStore', () => {
  it('starts with no entry loaded', () => {
    expect(useDailyEntryStore.getState().entry).toBeNull()
    expect(useDailyEntryStore.getState().status).toBe('idle')
  })

  it('loads null when there is no entry for that date yet', async () => {
    await useDailyEntryStore.getState().loadEntry('2026-03-01')

    expect(useDailyEntryStore.getState().entry).toBeNull()
    expect(useDailyEntryStore.getState().status).toBe('ready')
  })

  it('persists an entry and reflects it in state immediately', async () => {
    const entry = makeEntry()
    await useDailyEntryStore.getState().saveEntry(entry)

    expect(useDailyEntryStore.getState().entry).toEqual(entry)
    expect(useDailyEntryStore.getState().date).toBe('2026-03-01')
  })

  it('loads the persisted entry for a given date', async () => {
    const entry = makeEntry({ date: '2026-03-05' })
    await useDailyEntryStore.getState().saveEntry(entry)
    useDailyEntryStore.setState({ entry: null, status: 'idle' })

    await useDailyEntryStore.getState().loadEntry('2026-03-05')

    expect(useDailyEntryStore.getState().entry).toEqual(entry)
  })

  it('loads null for a different date even if another date has an entry', async () => {
    await useDailyEntryStore
      .getState()
      .saveEntry(makeEntry({ date: '2026-03-05' }))

    await useDailyEntryStore.getState().loadEntry('2026-03-06')

    expect(useDailyEntryStore.getState().entry).toBeNull()
  })
})
