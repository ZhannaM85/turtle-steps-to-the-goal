import { describe, expect, it } from 'vitest'
import { adjustForDayStart, effectiveDateFor, todayIsoForDayStart } from './dayStart'

describe('effectiveDateFor', () => {
  it('returns the same calendar day when dayStartTime is midnight (default, unchanged behavior)', () => {
    const now = new Date(2026, 6, 23, 0, 30)
    const result = effectiveDateFor(now, '00:00')
    expect(result.getDate()).toBe(23)
  })

  it('returns the previous calendar day when now is before the configured start time', () => {
    const now = new Date(2026, 6, 23, 1, 30)
    const result = effectiveDateFor(now, '03:00')
    expect(result.getDate()).toBe(22)
  })

  it('returns the real calendar day once at or after the configured start time', () => {
    const now = new Date(2026, 6, 23, 3, 0)
    const result = effectiveDateFor(now, '03:00')
    expect(result.getDate()).toBe(23)
  })

  it('handles crossing a month boundary correctly', () => {
    const now = new Date(2026, 7, 1, 1, 0) // Aug 1, 01:00
    const result = effectiveDateFor(now, '03:00')
    expect(result.getMonth()).toBe(6) // July
    expect(result.getDate()).toBe(31)
  })
})

describe('todayIsoForDayStart (#601)', () => {
  it('returns the previous calendar date, formatted, when now is before day-start', () => {
    const now = new Date(2026, 7, 5, 1, 30) // Aug 5, 01:30
    expect(todayIsoForDayStart('04:00', now)).toBe('2026-08-04')
  })

  it('returns the real calendar date once at or after day-start', () => {
    const now = new Date(2026, 7, 5, 4, 0) // Aug 5, 04:00
    expect(todayIsoForDayStart('04:00', now)).toBe('2026-08-05')
  })

  it('matches the real calendar date for the default midnight setting', () => {
    const now = new Date(2026, 7, 5, 0, 30)
    expect(todayIsoForDayStart('00:00', now)).toBe('2026-08-05')
  })
})

describe('adjustForDayStart', () => {
  it('leaves a time at or after the cutoff unchanged', () => {
    expect(adjustForDayStart(600, 240)).toBe(600) // 10:00, cutoff 04:00
  })

  it('shifts a time before the cutoff forward by a full day', () => {
    expect(adjustForDayStart(82, 240)).toBe(82 + 24 * 60) // 01:22, cutoff 04:00
  })

  it('treats a time exactly at the cutoff as not needing adjustment', () => {
    expect(adjustForDayStart(240, 240)).toBe(240)
  })
})
