import { describe, expect, it } from 'vitest'
import {
  DAY_NOTE_TOOLTIP_MAX_CHARS,
  dayNotesByDate,
  truncateDayNote,
} from './dayNotePreview'

describe('truncateDayNote (#540)', () => {
  it('returns undefined for blank notes', () => {
    expect(truncateDayNote(undefined)).toBeUndefined()
    expect(truncateDayNote('')).toBeUndefined()
    expect(truncateDayNote('   ')).toBeUndefined()
  })

  it('returns the full note when short enough', () => {
    expect(truncateDayNote('Back from vacation')).toBe('Back from vacation')
  })

  it('truncates long notes with an ellipsis', () => {
    const long =
      'Came back from vacation and did not weigh for seven whole days somehow'
    const preview = truncateDayNote(long, 40)
    expect(preview).toBeDefined()
    expect(preview!.endsWith('…')).toBe(true)
    expect(preview!.length).toBeLessThanOrEqual(40)
  })
})

describe('dayNotesByDate (#540 / #711)', () => {
  it('maps only dates that have a non-empty note', () => {
    const map = dayNotesByDate([
      { date: '2026-01-01', note: 'Hello' },
      { date: '2026-01-02' },
      { date: '2026-01-03', note: '   ' },
    ])
    expect([...map.entries()]).toEqual([['2026-01-01', 'Hello']])
  })

  it('defaults to the longer tooltip budget so notes can wrap (#711)', () => {
    const long = 'x'.repeat(DAY_NOTE_TOOLTIP_MAX_CHARS + 20)
    const map = dayNotesByDate([{ date: '2026-01-01', note: long }])
    const preview = map.get('2026-01-01')
    expect(preview).toBeDefined()
    expect(preview!.endsWith('…')).toBe(true)
    expect(preview!.length).toBeLessThanOrEqual(DAY_NOTE_TOOLTIP_MAX_CHARS)
    expect(preview!.length).toBeGreaterThan(48)
  })
})
