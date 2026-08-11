import { describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import {
  applyHealthConnectWeight,
  applyHealthConnectWeights,
} from './applyHealthConnectWeight'

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

describe('applyHealthConnectWeights (#694)', () => {
  it('overwrites yesterday and today in one pass', () => {
    const existing = [
      entry({ id: 'y', date: '2026-08-10', weightKg: 59.5 }),
      entry({ id: 't', date: '2026-08-11', weightKg: 59.0, steps: 1000 }),
    ]
    const result = applyHealthConnectWeights(
      [
        { date: '2026-08-10', weightKg: 58.8 },
        { date: '2026-08-11', weightKg: 58.2 },
      ],
      existing,
    )
    expect(result).toHaveLength(2)
    const byDate = new Map(result.map((e) => [e.date, e]))
    expect(byDate.get('2026-08-10')?.weightKg).toBe(58.8)
    expect(byDate.get('2026-08-11')?.weightKg).toBe(58.2)
    expect(byDate.get('2026-08-11')?.steps).toBe(1000)
  })

  it('creates missing days from HC readings', () => {
    const result = applyHealthConnectWeights(
      [{ date: '2026-08-09', weightKg: 60 }],
      [],
    )
    expect(result).toHaveLength(1)
    expect(result[0].date).toBe('2026-08-09')
    expect(result[0].weightKg).toBe(60)
  })
})
