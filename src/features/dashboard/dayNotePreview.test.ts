import { describe, expect, it } from 'vitest'
import { dayNotesByDate, truncateDayNote } from './dayNotePreview'

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

describe('dayNotesByDate (#540)', () => {
  it('maps only dates that have a non-empty note', () => {
    const map = dayNotesByDate([
      { date: '2026-01-01', note: 'Hello' },
      { date: '2026-01-02' },
      { date: '2026-01-03', note: '   ' },
    ])
    expect([...map.entries()]).toEqual([['2026-01-01', 'Hello']])
  })
})
