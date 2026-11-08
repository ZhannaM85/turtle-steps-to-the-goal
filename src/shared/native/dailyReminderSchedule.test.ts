import { describe, expect, it } from 'vitest'
import {
  nextDailyReminderAt,
  parseReminderTime,
  resolveTodayHasEntry,
} from './dailyReminderSchedule'

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

describe('resolveTodayHasEntry (#1123)', () => {
  it('trusts the store when the loaded day is today with an entry', () => {
    expect(
      resolveTodayHasEntry({
        today: '2026-11-07',
        storeDate: '2026-11-07',
        storeHasEntry: true,
        repositoryEntry: 'unavailable',
      }),
    ).toBe('yes')
  })

  it('returns unknown when IndexedDB is unavailable and store is not today', () => {
    expect(
      resolveTodayHasEntry({
        today: '2026-11-07',
        storeDate: '2026-11-06',
        storeHasEntry: true,
        repositoryEntry: 'unavailable',
      }),
    ).toBe('unknown')
  })

  it('uses the repository when the store is on another day', () => {
    expect(
      resolveTodayHasEntry({
        today: '2026-11-07',
        storeDate: '2026-11-06',
        storeHasEntry: true,
        repositoryEntry: 'yes',
      }),
    ).toBe('yes')
    expect(
      resolveTodayHasEntry({
        today: '2026-11-07',
        storeDate: null,
        storeHasEntry: false,
        repositoryEntry: 'no',
      }),
    ).toBe('no')
  })
})
