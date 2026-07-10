import { describe, expect, it } from 'vitest'
import type { Goal } from '@/domain/goal'
import { projectedTrajectory } from './projectedTrajectory'

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  const now = '2026-01-01T00:00:00.000Z'
  return {
    id: 'goal-1',
    startDate: '2026-01-01',
    startWeightKg: 80,
    targetWeightKg: 70,
    targetWeeklyLossKg: 1,
    displayUnit: 'kg',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

describe('projectedTrajectory', () => {
  it('uses the explicit targetDate when set', () => {
    const goal = makeGoal({ targetDate: '2026-06-01' })

    expect(projectedTrajectory(goal)).toEqual([
      { date: '2026-01-01', weightKg: 80 },
      { date: '2026-06-01', weightKg: 70 },
    ])
  })

  it('derives the target date from the weekly pace when targetDate is absent', () => {
    // 10kg to lose at 1kg/week = 10 weeks = 70 days
    const goal = makeGoal({
      startWeightKg: 80,
      targetWeightKg: 70,
      targetWeeklyLossKg: 1,
    })

    const [, endPoint] = projectedTrajectory(goal)

    expect(endPoint).toEqual({ date: '2026-03-12', weightKg: 70 })
  })

  it('collapses to a flat (zero-length) line when no weight change is needed', () => {
    const goal = makeGoal({ startWeightKg: 75, targetWeightKg: 75 })

    expect(projectedTrajectory(goal)).toEqual([
      { date: '2026-01-01', weightKg: 75 },
      { date: '2026-01-01', weightKg: 75 },
    ])
  })

  it('returns only the start point (single data point) when the pace cannot reach the target', () => {
    const goal = makeGoal({
      startWeightKg: 80,
      targetWeightKg: 70,
      targetWeeklyLossKg: 0,
    })

    expect(projectedTrajectory(goal)).toEqual([
      { date: '2026-01-01', weightKg: 80 },
    ])
  })

  it('returns only the start point when targetWeeklyLossKg is negative', () => {
    const goal = makeGoal({
      startWeightKg: 80,
      targetWeightKg: 70,
      targetWeeklyLossKg: -1,
    })

    expect(projectedTrajectory(goal)).toEqual([
      { date: '2026-01-01', weightKg: 80 },
    ])
  })
})
