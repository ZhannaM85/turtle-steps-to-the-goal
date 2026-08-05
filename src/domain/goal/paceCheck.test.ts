import { describe, expect, it } from 'vitest'
import type { Goal } from './Goal'
import type { PastGoalRecord } from './goalHistory'
import type { GoalWindowProgress } from './goalWindowProgress'
import { paceCheckInsight } from './paceCheck'

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'goal-1',
    targetWeeklyLossKg: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function missedWindow(
  baselineWeightKg: number,
  currentWeightKg: number,
): GoalWindowProgress {
  return {
    weekStart: '2026-01-01',
    weekEnd: '2026-01-07',
    targetMet: false,
    metOnDate: null,
    baselineWeightKg,
    currentWeightKg,
  }
}

function hitWindow(): GoalWindowProgress {
  return {
    weekStart: '2026-01-01',
    weekEnd: '2026-01-07',
    targetMet: true,
    metOnDate: '2026-01-05',
    baselineWeightKg: 90,
    currentWeightKg: 88.5,
  }
}

function record(progress: GoalWindowProgress | null): PastGoalRecord {
  return { goal: makeGoal(), progress }
}

describe('paceCheckInsight (#610)', () => {
  it('is null with fewer than 3 past windows', () => {
    const records = [record(missedWindow(90, 89.5)), record(missedWindow(89.5, 89))]
    expect(paceCheckInsight(records, 1)).toBeNull()
  })

  it('reports the average actual weekly change across 3 consecutive misses', () => {
    const records = [
      record(missedWindow(90, 89.5)), // lost 0.5kg
      record(missedWindow(89.5, 89.2)), // lost 0.3kg
      record(missedWindow(89.2, 89.3)), // gained 0.1kg (delta -0.1)
    ]
    const insight = paceCheckInsight(records, 1)
    expect(insight).not.toBeNull()
    expect(insight?.windowCount).toBe(3)
    expect(insight?.targetWeeklyLossKg).toBe(1)
    expect(insight?.averageWeeklyDeltaKg).toBeCloseTo((0.5 + 0.3 - 0.1) / 3, 5)
  })

  it('ignores anything past the most recent 3, even if also missed', () => {
    const records = [
      record(missedWindow(90, 89.5)),
      record(missedWindow(89.5, 89.2)),
      record(missedWindow(89.2, 88.9)),
      record(missedWindow(200, 100)), // would wildly skew the average if counted
    ]
    const insight = paceCheckInsight(records, 1)
    expect(insight?.windowCount).toBe(3)
    expect(insight?.averageWeeklyDeltaKg).toBeLessThan(1)
  })

  it('is null once a hit breaks the consecutive-miss streak', () => {
    const records = [
      record(missedWindow(90, 89.5)),
      record(hitWindow()),
      record(missedWindow(89.2, 88.9)),
    ]
    expect(paceCheckInsight(records, 1)).toBeNull()
  })

  it('is null when a recent window was never assessed (no baseline yet)', () => {
    const records = [
      record(missedWindow(90, 89.5)),
      record(missedWindow(89.5, 89.2)),
      record({
        weekStart: '2026-01-01',
        weekEnd: '2026-01-07',
        targetMet: null,
        metOnDate: null,
      }),
    ]
    expect(paceCheckInsight(records, 1)).toBeNull()
  })

  it('is null with no past records', () => {
    expect(paceCheckInsight([], 1)).toBeNull()
  })
})
