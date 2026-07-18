import { describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import type { Goal } from './Goal'
import { pastGoals } from './goalHistory'

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'goal-1',
    targetWeeklyLossKg: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

let idCounter = 0
function entry(date: string, overrides: Partial<DailyEntry> = {}): DailyEntry {
  idCounter += 1
  const now = '2026-01-01T00:00:00.000Z'
  return {
    id: `entry-${idCounter}`,
    date,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

describe('pastGoals', () => {
  it('returns nothing when only one goal has ever been saved', () => {
    const goals = [makeGoal({ id: 'g1', createdAt: '2026-01-01T00:00:00Z' })]
    expect(pastGoals(goals, [])).toEqual([])
  })

  it('excludes the most recently created goal (the active one)', () => {
    const goals = [
      makeGoal({ id: 'g1', createdAt: '2026-01-01T00:00:00Z' }),
      makeGoal({ id: 'g2', createdAt: '2026-01-08T00:00:00Z' }),
    ]
    const result = pastGoals(goals, [])
    expect(result).toHaveLength(1)
    expect(result[0].goal.id).toBe('g1')
  })

  it('orders past goals newest-first', () => {
    const goals = [
      makeGoal({ id: 'g1', createdAt: '2026-01-01T00:00:00Z' }),
      makeGoal({ id: 'g2', createdAt: '2026-01-08T00:00:00Z' }),
      makeGoal({ id: 'g3', createdAt: '2026-01-15T00:00:00Z' }),
    ]
    const result = pastGoals(goals, [])
    expect(result.map((r) => r.goal.id)).toEqual(['g2', 'g1'])
  })

  it("pairs each past goal with its own window's progress", () => {
    const goals = [
      makeGoal({
        id: 'g1',
        createdAt: '2026-01-01T00:00:00Z',
        weekStart: '2026-01-01',
        targetWeeklyLossKg: 1,
      }),
      makeGoal({ id: 'g2', createdAt: '2026-01-08T00:00:00Z' }),
    ]
    const entries = [
      // Prior week (baseline for g1's window).
      entry('2025-12-27', { weightKg: 90 }),
      // g1's own window: -2kg, target 1kg — met.
      entry('2026-01-01', { weightKg: 88 }),
    ]
    const result = pastGoals(goals, entries)
    expect(result).toHaveLength(1)
    expect(result[0].progress?.targetMet).toBe(true)
  })

  it('reports null progress for a goal saved before #135 (no weekStart)', () => {
    const goals = [
      makeGoal({ id: 'g1', createdAt: '2026-01-01T00:00:00Z' }),
      makeGoal({ id: 'g2', createdAt: '2026-01-08T00:00:00Z' }),
    ]
    const result = pastGoals(goals, [])
    expect(result[0].progress).toBeNull()
  })
})
