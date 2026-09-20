import { describe, expect, it } from 'vitest'
import { pastGoalReachedStatusDate } from './pastGoalReachedStatusDate'

describe('pastGoalReachedStatusDate (#972)', () => {
  it('uses weekEnd when the target was first met mid-week', () => {
    expect(
      pastGoalReachedStatusDate({
        finalTargetMet: true,
        weekEnd: '2026-09-20',
      }),
    ).toBe('2026-09-20')
  })

  it('returns null for a not-reached week', () => {
    expect(
      pastGoalReachedStatusDate({
        finalTargetMet: false,
        weekEnd: '2026-09-20',
      }),
    ).toBeNull()
  })
})
