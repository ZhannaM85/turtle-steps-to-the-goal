import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import { db } from '@/infrastructure/persistence/indexeddb'
import { useDailyEntryStore, useLocalTransferStore } from '@/stores'
import {
  applyDaySnippet,
  LocalTransferDisabledError,
  planDaySnippetApply,
} from './applyDaySnippet'
import { dailyEntryToDaySnippet } from './daySnippetPayload'

function makeEntry(overrides: Partial<DailyEntry> = {}): DailyEntry {
  return {
    id: 'local-day',
    date: '2026-08-14',
    createdAt: '2026-08-14T07:00:00.000Z',
    updatedAt: '2026-08-14T07:00:00.000Z',
    ...overrides,
  }
}

describe('applyDaySnippet (#719)', () => {
  beforeEach(async () => {
    localStorage.clear()
    useLocalTransferStore.setState({ enabled: true })
    useDailyEntryStore.setState({
      date: null,
      entry: null,
      status: 'idle',
      error: null,
    })
    await db.dailyEntries.clear()
  })

  it('fills empty sleep without touching existing weight', () => {
    const incoming = dailyEntryToDaySnippet(
      makeEntry({
        id: 'pwa',
        sleepHours: 7.5,
        weightKg: 58.2,
      }),
    )
    const existing = makeEntry({ weightKg: 58.65 })
    const plan = planDaySnippetApply(incoming, existing)
    expect(plan.fills.sleepHours).toBe(7.5)
    expect(plan.fills.weightKg).toBeUndefined()
    expect(plan.conflicts).toEqual([
      { field: 'weightKg', local: 58.65, incoming: 58.2 },
    ])
  })

  it('skips a duplicate meal and appends a new one', () => {
    const breakfast = {
      id: 'm1',
      createdAt: '2026-08-14T07:10:00.000Z',
      label: 'Breakfast',
      items: [{ id: 'i1', name: 'Eggs', amountKcal: 280 }],
    }
    const lunch = {
      id: 'm2',
      createdAt: '2026-08-14T12:00:00.000Z',
      label: 'Lunch',
      items: [{ id: 'i2', name: 'Soup', amountKcal: 150 }],
    }
    const incoming = dailyEntryToDaySnippet(
      makeEntry({ calorieEntries: [breakfast, lunch] }),
    )
    const existing = makeEntry({
      calorieEntries: [
        {
          ...breakfast,
          id: 'other-id',
          items: [{ ...breakfast.items[0], id: 'other-item' }],
        },
      ],
    })
    const plan = planDaySnippetApply(incoming, existing)
    expect(plan.mealsSkippedDuplicates).toBe(1)
    expect(plan.mealsToAppend).toHaveLength(1)
    expect(plan.mealsToAppend[0]?.label).toBe('Lunch')
  })

  it('creates the day when none exists and refuses when the toggle is off', async () => {
    const payload = dailyEntryToDaySnippet(makeEntry({ sleepHours: 8 }))
    const { entry } = await applyDaySnippet(payload)
    expect(entry.sleepHours).toBe(8)
    expect(entry.date).toBe('2026-08-14')
    expect(entry.id).not.toBe('local-day')

    const stored = await db.dailyEntries.where('date').equals('2026-08-14').first()
    expect(stored?.sleepHours).toBe(8)

    useLocalTransferStore.setState({ enabled: false })
    await expect(applyDaySnippet(payload)).rejects.toBeInstanceOf(
      LocalTransferDisabledError,
    )
  })

  it('overwrites a conflict only when that field is listed', async () => {
    await db.dailyEntries.put(makeEntry({ sleepHours: 6, weightKg: 58.65 }))
    const payload = dailyEntryToDaySnippet(
      makeEntry({ id: 'pwa', sleepHours: 8, weightKg: 58.2 }),
    )

    await applyDaySnippet(payload)
    let stored = await db.dailyEntries.where('date').equals('2026-08-14').first()
    expect(stored?.sleepHours).toBe(6)
    expect(stored?.weightKg).toBe(58.65)

    await applyDaySnippet(payload, { overwriteFields: ['sleepHours'] })
    stored = await db.dailyEntries.where('date').equals('2026-08-14').first()
    expect(stored?.sleepHours).toBe(8)
    expect(stored?.weightKg).toBe(58.65)
  })
})
