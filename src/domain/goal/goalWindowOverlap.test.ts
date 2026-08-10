import { describe, expect, it } from 'vitest'
import {
  draftWindowOverlapsOthers,
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

describe('draftWindowOverlapsOthers (#685)', () => {
  const previous = {
    id: 'prev',
    weekStart: '2026-08-04',
    weekEnd: '2026-08-09',
  }
  const active = {
    id: 'active',
    weekStart: '2026-08-10',
    weekEnd: '2026-08-16',
  }

  it('detects overlap with a previous goal while editing another', () => {
    expect(
      draftWindowOverlapsOthers(
        { weekStart: '2026-08-08', weekEnd: '2026-08-14' },
        [active, previous],
        'active',
      ),
    ).toBe(true)
  })

  it('does not warn against the goal being edited in place', () => {
    expect(
      draftWindowOverlapsOthers(
        { weekStart: '2026-08-10', weekEnd: '2026-08-16' },
        [active, previous],
        'active',
      ),
    ).toBe(false)
  })
})
