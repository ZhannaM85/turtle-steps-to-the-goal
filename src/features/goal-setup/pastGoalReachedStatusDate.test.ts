import { describe, expect, it } from 'vitest'
import {
  earlyReachedOnDate,
  pastGoalHistoryWeekEnd,
  pastGoalReachedStatusDate,
} from './pastGoalReachedStatusDate'

describe('pastGoalReachedStatusDate (#1079)', () => {
  it('uses the weigh-in day when the target was met before the planned week end', () => {
    expect(
      pastGoalReachedStatusDate({
        finalTargetMet: true,
        weekEnd: '2026-09-20',
        metOnDate: '2026-09-19',
      }),
    ).toBe('2026-09-19')
  })

  it('uses the weigh-in day when that day is the planned week end', () => {
    expect(
      pastGoalReachedStatusDate({
        finalTargetMet: true,
        weekEnd: '2026-09-20',
        metOnDate: '2026-09-20',
      }),
    ).toBe('2026-09-20')
  })

  it('falls back to the latest weigh-in when metOnDate was not recorded', () => {
    expect(
      pastGoalReachedStatusDate({
        finalTargetMet: true,
        weekEnd: '2026-09-20',
        metOnDate: null,
        currentWeightDate: '2026-09-19',
      }),
    ).toBe('2026-09-19')
  })

  it('returns null for a not-reached week even if a mid-week day once crossed the target', () => {
    expect(
      pastGoalReachedStatusDate({
        finalTargetMet: false,
        weekEnd: '2026-09-20',
        metOnDate: '2026-09-18',
      }),
    ).toBeNull()
  })
})

describe('pastGoalHistoryWeekEnd (#1079)', () => {
  const goal = { weekStart: '2026-09-14', weekEnd: '2026-09-20' }

  it('ends an early reach on the weigh-in day', () => {
    expect(
      pastGoalHistoryWeekEnd(goal, {
        finalTargetMet: true,
        weekEnd: '2026-09-20',
        metOnDate: '2026-09-19',
      }),
    ).toBe('2026-09-19')
  })

  it('keeps the planned end when the target was missed', () => {
    expect(
      pastGoalHistoryWeekEnd(goal, {
        finalTargetMet: false,
        weekEnd: '2026-09-20',
        metOnDate: '2026-09-18',
      }),
    ).toBe('2026-09-20')
  })

  it('keeps the planned end when the goal was reached on that day', () => {
    expect(
      pastGoalHistoryWeekEnd(goal, {
        finalTargetMet: true,
        weekEnd: '2026-09-20',
        metOnDate: '2026-09-20',
      }),
    ).toBe('2026-09-20')
  })
})

describe('earlyReachedOnDate (#1079)', () => {
  it('returns the weigh-in day only when it is before the planned week end', () => {
    expect(
      earlyReachedOnDate({
        finalTargetMet: true,
        weekEnd: '2026-09-20',
        metOnDate: '2026-09-19',
      }),
    ).toBe('2026-09-19')
    expect(
      earlyReachedOnDate({
        finalTargetMet: true,
        weekEnd: '2026-09-20',
        metOnDate: '2026-09-20',
      }),
    ).toBeNull()
  })
})
