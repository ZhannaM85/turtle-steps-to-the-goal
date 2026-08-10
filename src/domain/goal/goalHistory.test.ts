import { describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import type { Goal } from './Goal'
import { earliestGoalCreatedAt, pastGoals } from './goalHistory'

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

describe('earliestGoalCreatedAt', () => {
  it('returns undefined for no goals', () => {
    expect(earliestGoalCreatedAt([])).toBeUndefined()
  })

  it('returns the only goal\'s createdAt when just one exists', () => {
    const goals = [makeGoal({ id: 'g1', createdAt: '2026-01-01T00:00:00Z' })]
    expect(earliestGoalCreatedAt(goals)).toBe('2026-01-01T00:00:00Z')
  })

  it('picks the earliest createdAt regardless of array order (#426)', () => {
    const goals = [
      makeGoal({ id: 'g3', createdAt: '2026-01-15T00:00:00Z' }),
      makeGoal({ id: 'g1', createdAt: '2026-01-01T00:00:00Z' }),
      makeGoal({ id: 'g2', createdAt: '2026-01-08T00:00:00Z' }),
    ]
    expect(earliestGoalCreatedAt(goals)).toBe('2026-01-01T00:00:00Z')
  })
})

describe('pastGoals', () => {
  it('returns nothing when only one goal has ever been saved and its window is still live', () => {
    const goals = [
      makeGoal({
        id: 'g1',
        createdAt: '2026-01-01T00:00:00Z',
        weekStart: '2026-08-04',
      }),
    ]
    expect(pastGoals(goals, [], '2026-08-06')).toEqual([])
  })

  it('returns nothing for a single goal with no weekStart (cannot conclude)', () => {
    const goals = [makeGoal({ id: 'g1', createdAt: '2026-01-01T00:00:00Z' })]
    expect(pastGoals(goals, [])).toEqual([])
  })

  it('excludes the most recently created goal while its window is still live', () => {
    const goals = [
      makeGoal({
        id: 'g1',
        createdAt: '2026-01-01T00:00:00Z',
        weekStart: '2026-01-01',
      }),
      makeGoal({
        id: 'g2',
        createdAt: '2026-01-08T00:00:00Z',
        weekStart: '2026-08-04',
      }),
    ]
    const result = pastGoals(goals, [], '2026-08-06')
    expect(result).toHaveLength(1)
    expect(result[0].goal.id).toBe('g1')
  })

  it('includes the active goal once its window has concluded (#678)', () => {
    const goals = [
      makeGoal({
        id: 'g1',
        createdAt: '2026-01-01T00:00:00Z',
        weekStart: '2026-01-01',
      }),
      makeGoal({
        id: 'g2',
        createdAt: '2026-08-04T00:00:00Z',
        weekStart: '2026-08-04',
      }),
    ]
    // g2's weekEnd is 2026-08-10; today past that → concluded.
    const result = pastGoals(goals, [], '2026-08-11')
    expect(result.map((r) => r.goal.id)).toEqual(['g2', 'g1'])
  })

  it('includes a sole concluded goal in Past Targets before a new one is set (#678)', () => {
    const goals = [
      makeGoal({
        id: 'g1',
        createdAt: '2026-08-04T00:00:00Z',
        weekStart: '2026-08-04',
      }),
    ]
    const result = pastGoals(goals, [], '2026-08-11')
    expect(result).toHaveLength(1)
    expect(result[0].goal.id).toBe('g1')
  })

  it('includes the active goal on weekEnd itself when the target was reached that day (#678)', () => {
    const goals = [
      makeGoal({
        id: 'g1',
        createdAt: '2026-08-04T00:00:00Z',
        weekStart: '2026-08-04',
        targetWeeklyLossKg: 0.2,
        baselineWeightKg: 70,
      }),
    ]
    const entries = [entry('2026-08-10', { weightKg: 69.7 })]
    // weekEnd is 2026-08-10; reached that day → goalWindowConcluded.
    const result = pastGoals(goals, entries, '2026-08-10')
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
      // g1's own window (#203: day-over-day, not an average) — weekStart's
      // own weight as the baseline, a later day 2kg below it, target 1kg — met.
      entry('2026-01-01', { weightKg: 89 }),
      entry('2026-01-02', { weightKg: 87 }),
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

  describe('approximateEndDate for a legacy goal with no weekStart (#181)', () => {
    it("derives it from the date the goal that superseded it was created", () => {
      const goals = [
        makeGoal({ id: 'g1', createdAt: '2026-01-01T00:00:00Z' }),
        makeGoal({ id: 'g2', createdAt: '2026-01-08T12:00:00Z' }),
      ]
      const result = pastGoals(goals, [])
      expect(result[0].goal.id).toBe('g1')
      expect(result[0].approximateEndDate).toBe('2026-01-08')
    })

    it('is undefined for a goal that already has a real weekStart', () => {
      const goals = [
        makeGoal({
          id: 'g1',
          createdAt: '2026-01-01T00:00:00Z',
          weekStart: '2026-01-01',
        }),
        makeGoal({ id: 'g2', createdAt: '2026-01-08T00:00:00Z' }),
      ]
      const result = pastGoals(goals, [])
      expect(result[0].approximateEndDate).toBeUndefined()
    })

    it('uses each superseding goal correctly across multiple legacy entries', () => {
      const goals = [
        makeGoal({ id: 'g1', createdAt: '2026-01-01T00:00:00Z' }),
        makeGoal({ id: 'g2', createdAt: '2026-01-08T00:00:00Z' }),
        makeGoal({ id: 'g3', createdAt: '2026-01-15T00:00:00Z' }),
      ]
      const result = pastGoals(goals, [])
      // Newest-first: g2 (superseded by g3), then g1 (superseded by g2).
      expect(result.map((r) => r.goal.id)).toEqual(['g2', 'g1'])
      expect(result[0].approximateEndDate).toBe('2026-01-15')
      expect(result[1].approximateEndDate).toBe('2026-01-08')
    })
  })
})
