import { describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import type { Goal } from './Goal'
import { goalWeekEnd, goalWindowProgress } from './goalWindowProgress'

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  const now = '2026-01-01T00:00:00.000Z'
  return {
    id: 'goal-1',
    targetWeeklyLossKg: 1,
    weekStart: '2026-03-09',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

let idCounter = 0
function makeEntry(date: string, weightKg?: number): DailyEntry {
  idCounter += 1
  const now = '2026-01-01T00:00:00.000Z'
  return {
    id: `entry-${idCounter}`,
    date,
    weightKg,
    createdAt: now,
    updatedAt: now,
  }
}

describe('goalWeekEnd', () => {
  it('is 6 days after weekStart', () => {
    expect(goalWeekEnd('2026-03-09')).toBe('2026-03-15')
  })
})

describe('goalWindowProgress', () => {
  it('returns null when the goal has no weekStart yet', () => {
    const goal = makeGoal({ weekStart: undefined })
    expect(goalWindowProgress([], goal)).toBeNull()
  })

  it('averages only entries within the weekStart..weekEnd window', () => {
    const goal = makeGoal({ weekStart: '2026-03-09' })
    const entries = [
      makeEntry('2026-03-08', 100), // day before the window — excluded
      makeEntry('2026-03-09', 80),
      makeEntry('2026-03-12', 78),
      makeEntry('2026-03-16', 999), // day after the window — excluded
    ]

    const progress = goalWindowProgress(entries, goal)

    expect(progress?.weekStart).toBe('2026-03-09')
    expect(progress?.weekEnd).toBe('2026-03-15')
    expect(progress?.averageWeightKg).toBe(79)
  })

  it('averages the 7 days immediately before weekStart as the prior baseline', () => {
    const goal = makeGoal({ weekStart: '2026-03-09' })
    const entries = [
      makeEntry('2026-03-01', 999), // more than 7 days before — excluded
      makeEntry('2026-03-02', 82),
      makeEntry('2026-03-08', 82),
      makeEntry('2026-03-09', 80),
    ]

    const progress = goalWindowProgress(entries, goal)

    expect(progress?.priorAverageWeightKg).toBe(82)
    expect(progress?.averageWeightKg).toBe(80)
    expect(progress?.deltaKg).toBe(-2)
  })

  it('leaves deltaKg/targetMet null without a prior-window baseline', () => {
    const goal = makeGoal({ weekStart: '2026-03-09' })
    const entries = [makeEntry('2026-03-09', 80)]

    const progress = goalWindowProgress(entries, goal)

    expect(progress?.priorAverageWeightKg).toBeNull()
    expect(progress?.deltaKg).toBeNull()
    expect(progress?.targetMet).toBeNull()
  })

  it('reports targetMet true when the loss meets the weekly target', () => {
    const goal = makeGoal({ weekStart: '2026-03-09', targetWeeklyLossKg: 1 })
    const entries = [
      makeEntry('2026-03-02', 82),
      makeEntry('2026-03-09', 80), // 2kg lost, target is 1kg
    ]

    expect(goalWindowProgress(entries, goal)?.targetMet).toBe(true)
  })

  it('reports targetMet false when the loss falls short of the weekly target', () => {
    const goal = makeGoal({ weekStart: '2026-03-09', targetWeeklyLossKg: 1 })
    const entries = [
      makeEntry('2026-03-02', 82),
      makeEntry('2026-03-09', 81.5), // 0.5kg lost, target is 1kg
    ]

    expect(goalWindowProgress(entries, goal)?.targetMet).toBe(false)
  })
})
