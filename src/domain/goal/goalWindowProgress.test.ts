import { describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import type { Goal } from './Goal'
import {
  goalCoveringDate,
  goalWeekEnd,
  goalWindowConcluded,
  goalWindowHasEnded,
  goalWindowProgress,
} from './goalWindowProgress'

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
function makeEntry(
  date: string,
  weightKg?: number,
  timestamps: { createdAt?: string; updatedAt?: string } = {},
): DailyEntry {
  idCounter += 1
  const now = '2026-01-01T00:00:00.000Z'
  return {
    id: `entry-${idCounter}`,
    date,
    weightKg,
    createdAt: timestamps.createdAt ?? now,
    updatedAt: timestamps.updatedAt ?? now,
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
    // #639: the sticky targetMet above stays true, but the window's real
    // final state (the 90kg day) did not meet the target — this is the
    // exact distinction the permanent history badge needs.
    expect(progress?.finalTargetMet).toBe(false)
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
  it('reports the baseline weight and the most recently logged weight, not a frozen met-date snapshot (#639)', () => {
    const goal = makeGoal({ weekStart: '2026-03-09', targetWeeklyLossKg: 1 })
    const entries = [
      makeEntry('2026-03-09', 80),
      makeEntry('2026-03-10', 79.5),
      makeEntry('2026-03-11', 79), // met here
      makeEntry('2026-03-12', 79.5), // rises again afterward — the real
      // #639 bug: this used to be silently dropped, and currentWeightKg
      // stayed frozen at 79 (the day it was first met) instead of
      // reflecting the actual latest weigh-in.
    ]

    const progress = goalWindowProgress(entries, goal)

    expect(progress?.baselineWeightKg).toBe(80)
    expect(progress?.currentWeightKg).toBe(79.5)
    // Sticky targetMet still reads true (met on day 3), but the window's
    // real final state (day 4, 79.5) is only a 0.5kg loss — short of the
    // 1kg target.
    expect(progress?.targetMet).toBe(true)
    expect(progress?.finalTargetMet).toBe(false)
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

  it('leaves baselineWeightKg/currentWeightKg undefined when nothing before or on weekStart is logged', () => {
    const goal = makeGoal({ weekStart: '2026-03-09', targetWeeklyLossKg: 1 })
    const entries = [makeEntry('2026-03-10', 70)]

    const progress = goalWindowProgress(entries, goal)

    expect(progress?.baselineWeightKg).toBeUndefined()
    expect(progress?.currentWeightKg).toBeUndefined()
  })

  describe('frozen baseline snapshot (#676)', () => {
    it("prefers goal.baselineWeightKg over weekStart's own logged weight", () => {
      const goal = makeGoal({
        weekStart: '2026-03-09',
        targetWeeklyLossKg: 1,
        baselineWeightKg: 58.65,
      })
      // A weigh-in for weekStart itself, logged *after* the goal was
      // created — must not override the frozen snapshot.
      const entries = [makeEntry('2026-03-09', 58.9)]

      const progress = goalWindowProgress(entries, goal)

      expect(progress?.baselineWeightKg).toBe(58.65)
    })

    it('is assessable from weekStart day one when a frozen baseline exists, even with no weekStart weigh-in yet', () => {
      const goal = makeGoal({
        weekStart: '2026-03-09',
        targetWeeklyLossKg: 0.1,
        baselineWeightKg: 58.65,
      })
      const entries = [makeEntry('2026-03-09', 58.5)] // 0.15kg below baseline

      const progress = goalWindowProgress(entries, goal)

      expect(progress?.targetMet).toBe(true)
      expect(progress?.metOnDate).toBe('2026-03-09')
    })

    it("falls back to weekStart's own logged weight for a goal saved before this field existed, when that weigh-in already existed at creation", () => {
      const goal = makeGoal({
        weekStart: '2026-03-09',
        targetWeeklyLossKg: 1,
        baselineWeightKg: undefined,
        createdAt: '2026-03-09T12:00:00.000Z',
      })
      // Weighed in the morning, goal saved at noon — updatedAt <= createdAt.
      const entries = [
        makeEntry('2026-03-09', 80, {
          createdAt: '2026-03-09T08:00:00.000Z',
          updatedAt: '2026-03-09T08:00:00.000Z',
        }),
      ]

      const progress = goalWindowProgress(entries, goal)

      expect(progress?.baselineWeightKg).toBe(80)
    })

    it('ignores a post-creation weekStart weigh-in and keeps the prior-day weight when the snapshot is missing (reopen)', () => {
      const goal = makeGoal({
        weekStart: '2026-08-10',
        targetWeeklyLossKg: 0.1,
        baselineWeightKg: undefined,
        createdAt: '2026-08-10T10:00:00.000Z',
      })
      const entries = [
        makeEntry('2026-08-09', 58.65, {
          createdAt: '2026-08-09T07:00:00.000Z',
          updatedAt: '2026-08-09T07:00:00.000Z',
        }),
        makeEntry('2026-08-10', 58.9, {
          createdAt: '2026-08-10T15:00:00.000Z',
          updatedAt: '2026-08-10T15:00:00.000Z',
        }),
      ]

      const progress = goalWindowProgress(entries, goal)

      expect(progress?.baselineWeightKg).toBe(58.65)
    })

    it('uses the prior-day weight when weekStart has no weigh-in yet and the snapshot is missing', () => {
      const goal = makeGoal({
        weekStart: '2026-08-10',
        targetWeeklyLossKg: 0.1,
        baselineWeightKg: undefined,
        createdAt: '2026-08-10T10:00:00.000Z',
      })
      const entries = [
        makeEntry('2026-08-09', 58.65, {
          createdAt: '2026-08-09T07:00:00.000Z',
          updatedAt: '2026-08-09T07:00:00.000Z',
        }),
      ]

      const progress = goalWindowProgress(entries, goal)

      expect(progress?.baselineWeightKg).toBe(58.65)
    })
  })

  // #659 — an explicit weekEnd overrides the weekStart+6 default everywhere
  // the window's end is read, including which entries count.
  it('prefers an explicit goal.weekEnd over the weekStart+6 default', () => {
    const goal = makeGoal({ weekStart: '2026-03-09', weekEnd: '2026-03-11' })

    const progress = goalWindowProgress([], goal)

    expect(progress?.weekEnd).toBe('2026-03-11')
  })

  it('excludes entries after an explicit, earlier weekEnd', () => {
    const goal = makeGoal({
      weekStart: '2026-03-09',
      weekEnd: '2026-03-11',
      targetWeeklyLossKg: 1,
    })
    const entries = [
      makeEntry('2026-03-09', 80),
      makeEntry('2026-03-12', 78), // after the shortened window — excluded
    ]

    const progress = goalWindowProgress(entries, goal)

    expect(progress?.targetMet).toBe(false)
    expect(progress?.currentWeightKg).toBe(80)
  })
})

describe('goalWindowHasEnded (#639)', () => {
  it('is false while today is within the window', () => {
    expect(goalWindowHasEnded('2026-03-15', '2026-03-15')).toBe(false)
    expect(goalWindowHasEnded('2026-03-15', '2026-03-10')).toBe(false)
  })

  it('is true once today is past weekEnd', () => {
    expect(goalWindowHasEnded('2026-03-15', '2026-03-16')).toBe(true)
  })
})

describe('goalWindowConcluded (#667)', () => {
  it('is true once the calendar has actually passed weekEnd, same as goalWindowHasEnded', () => {
    expect(
      goalWindowConcluded(
        { weekEnd: '2026-03-15', finalTargetMet: false },
        '2026-03-16',
      ),
    ).toBe(true)
  })

  it('is true on weekEnd itself when the target was reached that day', () => {
    expect(
      goalWindowConcluded(
        { weekEnd: '2026-03-15', finalTargetMet: true },
        '2026-03-15',
      ),
    ).toBe(true)
  })

  it('is false on weekEnd itself when the target was not (yet) reached', () => {
    expect(
      goalWindowConcluded(
        { weekEnd: '2026-03-15', finalTargetMet: false },
        '2026-03-15',
      ),
    ).toBe(false)
    expect(
      goalWindowConcluded(
        { weekEnd: '2026-03-15', finalTargetMet: null },
        '2026-03-15',
      ),
    ).toBe(false)
  })

  it('is false before weekEnd even if the target was already reached mid-week', () => {
    expect(
      goalWindowConcluded(
        { weekEnd: '2026-03-15', finalTargetMet: true },
        '2026-03-12',
      ),
    ).toBe(false)
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

  // #659
  it('prefers an explicit goal.weekEnd over the weekStart+6 default', () => {
    const goals = [
      makeGoal({ id: 'g1', weekStart: '2026-07-29', weekEnd: '2026-07-31' }),
    ]
    expect(goalCoveringDate(goals, '2026-07-31')?.id).toBe('g1')
    expect(goalCoveringDate(goals, '2026-08-01')).toBeUndefined()
  })
})
