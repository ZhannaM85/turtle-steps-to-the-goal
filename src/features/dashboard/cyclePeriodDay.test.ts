import { describe, expect, it } from 'vitest'
import { isLoggedPeriodDay } from './cyclePeriodDay'

describe('isLoggedPeriodDay (#615)', () => {
  it('is true for a date that is itself a logged period day', () => {
    expect(isLoggedPeriodDay('2026-03-04', ['2026-03-04'])).toBe(true)
  })

  it('is true when the date matches any of several logged period days', () => {
    expect(
      isLoggedPeriodDay('2026-04-01', ['2026-03-04', '2026-04-01']),
    ).toBe(true)
  })

  // #615 reopened twice: a 10-day window, then a 5-day window, both still
  // fired on days with no real connection to a logged period. Period ended
  // 15 Jul; 20 Jul (5 days later) must not show the note.
  it('is false the day after a logged period ends', () => {
    expect(isLoggedPeriodDay('2026-07-16', ['2026-07-15'])).toBe(false)
  })

  it('is false for a day 5 days after a logged period ends', () => {
    expect(isLoggedPeriodDay('2026-07-20', ['2026-07-15'])).toBe(false)
  })

  it('is false when no period days are logged', () => {
    expect(isLoggedPeriodDay('2026-03-04', [])).toBe(false)
  })
})
