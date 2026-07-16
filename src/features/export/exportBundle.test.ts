import { describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import type { Goal } from '@/domain/goal'
import { buildExportBundle } from './exportBundle'

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  const now = '2026-01-01T00:00:00.000Z'
  return {
    id: 'goal-1',
    targetWeeklyLossKg: 1,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function makeEntry(overrides: Partial<DailyEntry> = {}): DailyEntry {
  const now = '2026-03-01T00:00:00.000Z'
  return {
    id: 'entry-1',
    date: '2026-03-01',
    weightKg: 80,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

describe('buildExportBundle', () => {
  it('wraps goals and entries with a version and export timestamp', () => {
    const goals = [makeGoal()]
    const entries = [makeEntry()]
    const bundle = buildExportBundle(goals, entries)

    expect(bundle.version).toBe(5)
    expect(bundle.goals).toEqual(goals)
    expect(bundle.dailyEntries).toEqual(entries)
    expect(() => new Date(bundle.exportedAt).toISOString()).not.toThrow()
  })

  it('handles no data at all (empty backup)', () => {
    const bundle = buildExportBundle([], [])
    expect(bundle.goals).toEqual([])
    expect(bundle.dailyEntries).toEqual([])
  })
})
