import { describe, expect, it } from 'vitest'
import { nextDailyReminderAt, parseReminderTime } from './dailyReminderSchedule'

describe('parseReminderTime', () => {
  it('parses HH:MM', () => {
    expect(parseReminderTime('20:00')).toEqual({ hour: 20, minute: 0 })
    expect(parseReminderTime('9:05')).toEqual({ hour: 9, minute: 5 })
  })

  it('rejects invalid values', () => {
    expect(parseReminderTime('24:00')).toBeNull()
    expect(parseReminderTime('20:60')).toBeNull()
    expect(parseReminderTime('nope')).toBeNull()
  })
})

describe('nextDailyReminderAt (#1108)', () => {
  it('uses today when there is no entry and the time is still ahead', () => {
    const now = new Date(2026, 9, 19, 18, 0, 0) // 19 Oct 2026 18:00 local
    const at = nextDailyReminderAt(now, '20:00', false)
    expect(at).toEqual(new Date(2026, 9, 19, 20, 0, 0))
  })

  it('skips to tomorrow when today already has an entry', () => {
    const now = new Date(2026, 9, 19, 18, 0, 0)
    const at = nextDailyReminderAt(now, '20:00', true)
    expect(at).toEqual(new Date(2026, 9, 20, 20, 0, 0))
  })

  it('skips to tomorrow when today is already past the reminder time', () => {
    const now = new Date(2026, 9, 19, 20, 30, 0)
    const at = nextDailyReminderAt(now, '20:00', false)
    expect(at).toEqual(new Date(2026, 9, 20, 20, 0, 0))
  })
})
