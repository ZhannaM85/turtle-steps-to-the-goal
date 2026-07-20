import { describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import type { Goal } from './Goal'
import {
  isDateWithinReachedWindow,
  isGoalMetOnDate,
  reachedGoalWindows,
} from './reachedGoalWindows'

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'goal-1',
    targetWeeklyLossKg: 0.5,
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

describe('reachedGoalWindows', () => {
  it('returns nothing when no goal has been reached', () => {
    const goals = [makeGoal({ weekStart: '2026-07-19' })]
    const entries = [entry('2026-07-19', { weightKg: 60 })]
    expect(reachedGoalWindows(goals, entries)).toEqual([])
  })

  it('returns nothing for a goal with no weekStart (pre-#135 record)', () => {
    const goals = [makeGoal({ weekStart: undefined })]
    expect(reachedGoalWindows(goals, [])).toEqual([])
  })

  it('reports the [weekStart, metOnDate] span for a reached window', () => {
    const goals = [makeGoal({ weekStart: '2026-07-19' })]
    const entries = [
      entry('2026-07-12', { weightKg: 60 }), // prior-week baseline
      // #177's MIN_WINDOW_DAYS_LOGGED (2) is satisfied by logged entries,
      // not calendar days — no entry on 07-20, running average after these
      // two is already 59.4 (-0.6kg, past the 0.5kg target) by 07-21.
      entry('2026-07-19', { weightKg: 59.4 }),
      entry('2026-07-21', { weightKg: 59.4 }),
    ]
    expect(reachedGoalWindows(goals, entries)).toEqual([
      { start: '2026-07-19', metOnDate: '2026-07-21' },
    ])
  })

  it('combines windows from multiple goals, past and active alike', () => {
    const goals = [
      makeGoal({ id: 'g1', weekStart: '2026-07-05' }),
      makeGoal({ id: 'g2', weekStart: '2026-07-19' }),
    ]
    const entries = [
      entry('2026-06-28', { weightKg: 61 }),
      entry('2026-07-05', { weightKg: 60.4 }),
      entry('2026-07-07', { weightKg: 60.4 }), // g1: -0.6kg — met
      entry('2026-07-12', { weightKg: 60 }),
      entry('2026-07-19', { weightKg: 59.4 }),
      entry('2026-07-21', { weightKg: 59.4 }), // g2: -0.6kg — met
    ]
    expect(reachedGoalWindows(goals, entries)).toEqual([
      { start: '2026-07-05', metOnDate: '2026-07-07' },
      { start: '2026-07-19', metOnDate: '2026-07-21' },
    ])
  })
})

describe('isDateWithinReachedWindow', () => {
  const windows = [{ start: '2026-07-19', metOnDate: '2026-07-21' }]

  it('is true for every day within the span, inclusive', () => {
    expect(isDateWithinReachedWindow('2026-07-19', windows)).toBe(true)
    expect(isDateWithinReachedWindow('2026-07-20', windows)).toBe(true)
    expect(isDateWithinReachedWindow('2026-07-21', windows)).toBe(true)
  })

  it('is false before the window starts or after it was reached', () => {
    expect(isDateWithinReachedWindow('2026-07-18', windows)).toBe(false)
    expect(isDateWithinReachedWindow('2026-07-22', windows)).toBe(false)
  })
})

describe('isGoalMetOnDate', () => {
  const windows = [{ start: '2026-07-19', metOnDate: '2026-07-21' }]

  it('is true only for the exact reach-day', () => {
    expect(isGoalMetOnDate('2026-07-21', windows)).toBe(true)
    expect(isGoalMetOnDate('2026-07-20', windows)).toBe(false)
    expect(isGoalMetOnDate('2026-07-19', windows)).toBe(false)
  })
})
