import { describe, expect, it } from 'vitest'
import { resolveWeekStartsOn } from './resolveWeekStartsOn'

describe('resolveWeekStartsOn', () => {
  it('returns Monday for the monday preference regardless of entry date', () => {
    expect(resolveWeekStartsOn('monday', '2026-03-04')).toBe(1)
    expect(resolveWeekStartsOn('monday', undefined)).toBe(1)
  })

  it('returns the earliest entry\'s weekday for firstEntryWeekday', () => {
    // 2026-03-04 is a Wednesday
    expect(resolveWeekStartsOn('firstEntryWeekday', '2026-03-04')).toBe(3)
    // 2026-03-08 is a Sunday
    expect(resolveWeekStartsOn('firstEntryWeekday', '2026-03-08')).toBe(0)
  })

  it('falls back to Monday for firstEntryWeekday when there is no entry yet', () => {
    expect(resolveWeekStartsOn('firstEntryWeekday', undefined)).toBe(1)
  })
})
