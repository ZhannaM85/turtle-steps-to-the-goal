import { describe, expect, it } from 'vitest'
import {
  goalWindowsOverlap,
  inclusiveDateRangesOverlap,
} from './goalWindowOverlap'

describe('inclusiveDateRangesOverlap (#683)', () => {
  it('detects partial overlap', () => {
    expect(
      inclusiveDateRangesOverlap(
        '2026-08-04',
        '2026-08-10',
        '2026-08-08',
        '2026-08-14',
      ),
    ).toBe(true)
  })

  it('detects shared boundary day (inclusive)', () => {
    expect(
      inclusiveDateRangesOverlap(
        '2026-08-04',
        '2026-08-10',
        '2026-08-10',
        '2026-08-16',
      ),
    ).toBe(true)
  })

  it('is false when ranges are adjacent without sharing a day', () => {
    expect(
      inclusiveDateRangesOverlap(
        '2026-08-04',
        '2026-08-09',
        '2026-08-10',
        '2026-08-16',
      ),
    ).toBe(false)
  })
})

describe('goalWindowsOverlap (#683)', () => {
  it('uses weekEnd when set, else weekStart+6', () => {
    expect(
      goalWindowsOverlap(
        { weekStart: '2026-08-04', weekEnd: '2026-08-10' },
        { weekStart: '2026-08-10' },
      ),
    ).toBe(true)
    expect(
      goalWindowsOverlap(
        { weekStart: '2026-08-04', weekEnd: '2026-08-09' },
        { weekStart: '2026-08-10' },
      ),
    ).toBe(false)
  })

  it('is false when either goal lacks weekStart', () => {
    expect(
      goalWindowsOverlap(
        { weekStart: undefined },
        { weekStart: '2026-08-10' },
      ),
    ).toBe(false)
  })
})
