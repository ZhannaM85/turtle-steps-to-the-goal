import { describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import type { Goal } from '@/domain/goal'
import { projectedPaceTrajectory } from './projectedPaceTrajectory'

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'goal-1',
    targetWeeklyLossKg: 1,
    displayUnit: 'kg',
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

describe('projectedPaceTrajectory', () => {
  it('returns an empty array with no goal', () => {
    const entries = [entry('2026-03-01', { weightKg: 80 })]
    expect(projectedPaceTrajectory(entries, null)).toEqual([])
  })

  it('returns an empty array with no logged weight yet', () => {
    const entries = [
      entry('2026-03-01', {
        calorieEntries: [
          { id: 'c1', amountKcal: 1900, createdAt: '2026-01-01T00:00:00.000Z' },
        ],
      }),
    ]
    expect(projectedPaceTrajectory(entries, makeGoal())).toEqual([])
  })

  it('returns an empty array with no entries at all', () => {
    expect(projectedPaceTrajectory([], makeGoal())).toEqual([])
  })

  it('projects 4 weeks forward from the latest weighed entry at the goal pace', () => {
    const entries = [
      entry('2026-03-01', { weightKg: 82 }),
      entry('2026-03-10', { weightKg: 80 }),
    ]
    const [start, end] = projectedPaceTrajectory(
      entries,
      makeGoal({ targetWeeklyLossKg: 1 }),
    )

    expect(start).toEqual({ date: '2026-03-10', weightKg: 80 })
    expect(end).toEqual({ date: '2026-04-07', weightKg: 76 })
  })

  it('ignores entries with no weightKg when finding the latest point', () => {
    const entries = [
      entry('2026-03-01', { weightKg: 80 }),
      entry('2026-03-05', {
        calorieEntries: [
          { id: 'c1', amountKcal: 1800, createdAt: '2026-01-01T00:00:00.000Z' },
        ],
      }),
    ]
    const [start] = projectedPaceTrajectory(entries, makeGoal())

    expect(start).toEqual({ date: '2026-03-01', weightKg: 80 })
  })

  it('never projects a negative weight', () => {
    const entries = [entry('2026-03-01', { weightKg: 2 })]
    const [, end] = projectedPaceTrajectory(
      entries,
      makeGoal({ targetWeeklyLossKg: 5 }),
    )

    expect(end.weightKg).toBe(0)
  })
})
