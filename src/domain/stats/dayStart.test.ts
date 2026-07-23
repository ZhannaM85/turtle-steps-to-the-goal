import { describe, expect, it } from 'vitest'
import { effectiveDateFor } from './dayStart'

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
