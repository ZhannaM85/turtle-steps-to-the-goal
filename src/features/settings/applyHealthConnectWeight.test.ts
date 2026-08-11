import { describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import { applyHealthConnectWeight } from './applyHealthConnectWeight'

function entry(overrides: Partial<DailyEntry> & { date: string }): DailyEntry {
  return {
    id: 'existing-id',
    createdAt: '2026-08-11T08:00:00.000Z',
    updatedAt: '2026-08-11T08:00:00.000Z',
    ...overrides,
  }
}

describe('applyHealthConnectWeight (#693)', () => {
  it('fills weight when the day has none yet', () => {
    const result = applyHealthConnectWeight('2026-08-11', 58.5, undefined)
    expect(result.date).toBe('2026-08-11')
    expect(result.weightKg).toBe(58.5)
  })

  it('overwrites an already-logged weight on explicit Sync', () => {
    const existing = entry({ date: '2026-08-11', weightKg: 59.0, steps: 4000 })
    const result = applyHealthConnectWeight('2026-08-11', 58.2, existing)
    expect(result.id).toBe('existing-id')
    expect(result.weightKg).toBe(58.2)
    expect(result.steps).toBe(4000)
  })
})
