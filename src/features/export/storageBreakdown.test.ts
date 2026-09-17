import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/infrastructure/persistence/indexeddb'
import { allocateStorageUsage, readStorageBreakdown } from './storageBreakdown'

afterEach(async () => {
  await db.goals.clear()
  vi.unstubAllGlobals()
  Object.defineProperty(navigator, 'storage', {
    configurable: true,
    value: undefined,
  })
})

describe('storage breakdown (#964)', () => {
  it('uses the browser storage categories when available', async () => {
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: {
        estimate: vi.fn().mockResolvedValue({
          usage: 1000,
          quota: 5000,
          usageDetails: { indexedDB: 500, caches: 300 },
        }),
      },
    })

    expect(await readStorageBreakdown()).toEqual({
      usage: 1000,
      quota: 5000,
      appData: 500,
      offlineCache: 300,
      other: 200,
      source: 'browser',
    })
  })

  it('measures app records when the browser provides only a total', async () => {
    await db.goals.put({
      id: 'storage-test-goal',
      targetWeeklyLossKg: 1,
      createdAt: '2026-09-17T00:00:00Z',
      updatedAt: '2026-09-17T00:00:00Z',
    })
    vi.stubGlobal('caches', {
      keys: async () => ['offline-app'],
      open: async () => ({
        keys: async () => ['app-shell'],
        match: async () => ({ blob: async () => new Blob(['cache']) }),
      }),
    })
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: { estimate: vi.fn().mockResolvedValue({ usage: 10000 }) },
    })

    const result = await readStorageBreakdown()
    expect(result?.source).toBe('measured')
    expect(result?.appData).toBeGreaterThan(0)
    expect(result?.offlineCache).toBe(5)
    expect(result?.other).toBeLessThan(10000)
  })

  it('keeps chart slices within the browser total when measurements exceed it', () => {
    const result = allocateStorageUsage(100, null, 80, 70, 'measured')
    expect(result.appData + result.offlineCache + result.other).toBeCloseTo(100)
    expect(result.other).toBe(0)
  })
})
