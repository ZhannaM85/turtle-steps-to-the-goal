import { describe, expect, it } from 'vitest'
import { deriveWeeklyPaceKg } from './deriveWeeklyPace'

describe('deriveWeeklyPaceKg', () => {
  it('derives 1kg/week over 10 weeks to lose 10kg', () => {
    const pace = deriveWeeklyPaceKg('2026-01-01', '2026-03-12', 80, 70)
    expect(pace).toBeCloseTo(1, 10)
  })

  it('returns 0 when the target date is not after the start date', () => {
    expect(deriveWeeklyPaceKg('2026-01-01', '2026-01-01', 80, 70)).toBe(0)
  })

  it('returns 0 when the target date is before the start date', () => {
    expect(deriveWeeklyPaceKg('2026-03-01', '2026-01-01', 80, 70)).toBe(0)
  })

  it('returns a negative pace when the target is a gain, not a loss', () => {
    const pace = deriveWeeklyPaceKg('2026-01-01', '2026-03-12', 70, 80)
    expect(pace).toBeCloseTo(-1, 10)
  })

  it('returns 0 pace when start and target weight are equal (no variance)', () => {
    const pace = deriveWeeklyPaceKg('2026-01-01', '2026-03-12', 75, 75)
    expect(pace).toBe(0)
  })
})
