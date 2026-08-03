import { describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import type { Goal } from './Goal'
import { goalCoveringDate, goalWeekEnd, goalWindowProgress } from './goalWindowProgress'

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

  it('leaves targetMet/metOnDate null until weekStart itself has a logged weight', () => {
    const goal = makeGoal({ weekStart: '2026-03-09', targetWeeklyLossKg: 1 })
    const entries = [
      // A day after weekStart, already well past the target — but with no
      // weekStart baseline to compare against, this can't be assessed yet.
      makeEntry('2026-03-10', 70),
    ]

    const progress = goalWindowProgress(entries, goal)

    expect(progress?.targetMet).toBeNull()
    expect(progress?.metOnDate).toBeNull()
  })

  it('reports targetMet false (not null) once weekStart has a weight but nothing has crossed the target yet', () => {
    const goal = makeGoal({ weekStart: '2026-03-09', targetWeeklyLossKg: 1 })
    const entries = [makeEntry('2026-03-09', 80)]

    const progress = goalWindowProgress(entries, goal)

    expect(progress?.targetMet).toBe(false)
    expect(progress?.metOnDate).toBeNull()
  })

  it('reports the first day whose weight is at least the target below weekStart\'s own weight', () => {
    const goal = makeGoal({ weekStart: '2026-03-09', targetWeeklyLossKg: 1 })
    const entries = [
      makeEntry('2026-03-09', 80),
      makeEntry('2026-03-10', 79.5), // 0.5kg down — not yet
      makeEntry('2026-03-11', 79), // 1kg down — met
      makeEntry('2026-03-12', 79.5), // rises again afterward
    ]

    const progress = goalWindowProgress(entries, goal)

    expect(progress?.targetMet).toBe(true)
    expect(progress?.metOnDate).toBe('2026-03-11')
  })

  it('stays met even if a later day rises back above the threshold', () => {
    const goal = makeGoal({ weekStart: '2026-03-09', targetWeeklyLossKg: 1 })
    const entries = [
      makeEntry('2026-03-09', 80),
      makeEntry('2026-03-10', 79), // met on this day
      makeEntry('2026-03-11', 90), // a later bad day
    ]

    const progress = goalWindowProgress(entries, goal)

    expect(progress?.targetMet).toBe(true)
    expect(progress?.metOnDate).toBe('2026-03-10')
  })

  it('is the #203 regression case: a day-over-day weight increase never reads as met', () => {
    const goal = makeGoal({ weekStart: '2026-07-19', targetWeeklyLossKg: 0.1 })
    const entries = [
      makeEntry('2026-07-19', 70),
      makeEntry('2026-07-20', 70.35), // +350g, the reported scenario
    ]

    const progress = goalWindowProgress(entries, goal)

    expect(progress?.targetMet).toBe(false)
    expect(progress?.metOnDate).toBeNull()
  })

  it('excludes entries outside [weekStart, weekEnd]', () => {
    const goal = makeGoal({ weekStart: '2026-03-09', targetWeeklyLossKg: 1 })
    const entries = [
      makeEntry('2026-03-08', 60), // day before the window — excluded
      makeEntry('2026-03-09', 80),
      makeEntry('2026-03-16', 60), // day after the window — excluded
    ]

    const progress = goalWindowProgress(entries, goal)

    expect(progress?.targetMet).toBe(false)
    expect(progress?.metOnDate).toBeNull()
  })

  it('skips days with no logged weight when scanning for the first day met', () => {
    const goal = makeGoal({ weekStart: '2026-03-09', targetWeeklyLossKg: 1 })
    const entries = [
      makeEntry('2026-03-09', 80),
      makeEntry('2026-03-10', undefined), // logged something else, no weight
      makeEntry('2026-03-11', 79),
    ]

    const progress = goalWindowProgress(entries, goal)

    expect(progress?.metOnDate).toBe('2026-03-11')
  })

  // #339: past-goal rows need to show which two weigh-ins a status came
  // from, not just the status label itself.
  it('reports the baseline weight and the weight that met the target', () => {
    const goal = makeGoal({ weekStart: '2026-03-09', targetWeeklyLossKg: 1 })
    const entries = [
      makeEntry('2026-03-09', 80),
      makeEntry('2026-03-10', 79.5),
      makeEntry('2026-03-11', 79), // met here
      makeEntry('2026-03-12', 79.5), // rises again afterward
    ]

    const progress = goalWindowProgress(entries, goal)

    expect(progress?.baselineWeightKg).toBe(80)
    expect(progress?.currentWeightKg).toBe(79)
  })

  it('falls back to the most recently logged weight in the window when the target was never met', () => {
    const goal = makeGoal({ weekStart: '2026-03-09', targetWeeklyLossKg: 1 })
    const entries = [
      makeEntry('2026-03-09', 80),
      makeEntry('2026-03-10', 79.8),
      makeEntry('2026-03-11', 79.7),
    ]

    const progress = goalWindowProgress(entries, goal)

    expect(progress?.targetMet).toBe(false)
    expect(progress?.baselineWeightKg).toBe(80)
    expect(progress?.currentWeightKg).toBe(79.7)
  })

  it('leaves baselineWeightKg/currentWeightKg undefined until weekStart has a logged weight', () => {
    const goal = makeGoal({ weekStart: '2026-03-09', targetWeeklyLossKg: 1 })
    const entries = [makeEntry('2026-03-10', 70)]

    const progress = goalWindowProgress(entries, goal)

    expect(progress?.baselineWeightKg).toBeUndefined()
    expect(progress?.currentWeightKg).toBeUndefined()
  })
})

describe('goalCoveringDate (#552)', () => {
  it('returns undefined when no goal window contains the date', () => {
    const goals = [makeGoal({ weekStart: '2026-07-29' })]
    expect(goalCoveringDate(goals, '2019-09-26')).toBeUndefined()
  })

  it('returns the goal whose week contains the date', () => {
    const goals = [makeGoal({ id: 'g1', weekStart: '2026-07-29' })]
    expect(goalCoveringDate(goals, '2026-08-01')?.id).toBe('g1')
    expect(goalCoveringDate(goals, '2026-07-29')?.id).toBe('g1')
    expect(goalCoveringDate(goals, goalWeekEnd('2026-07-29'))?.id).toBe('g1')
  })

  it('skips goals without weekStart', () => {
    const goals = [makeGoal({ weekStart: undefined })]
    expect(goalCoveringDate(goals, '2026-03-09')).toBeUndefined()
  })

  it('prefers the most recently created goal when windows overlap', () => {
    const goals = [
      makeGoal({
        id: 'older',
        weekStart: '2026-07-29',
        createdAt: '2026-07-01T00:00:00.000Z',
      }),
      makeGoal({
        id: 'newer',
        weekStart: '2026-07-29',
        createdAt: '2026-08-01T00:00:00.000Z',
      }),
    ]
    expect(goalCoveringDate(goals, '2026-08-02')?.id).toBe('newer')
  })
})
