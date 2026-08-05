import { describe, expect, it } from 'vitest'
import { backupReminderStatus, daysSince } from './lastBackupReminder'

const NOW = new Date('2026-08-05T12:00:00.000Z')

describe('daysSince', () => {
  it('floors partial days', () => {
    expect(daysSince('2026-08-01T00:00:00.000Z', NOW)).toBe(4)
  })

  it('never goes negative for a timestamp in the future', () => {
    expect(daysSince('2026-08-06T00:00:00.000Z', NOW)).toBe(0)
  })
})

describe('backupReminderStatus', () => {
  it('stays hidden before the threshold, counting from firstSeenAt when nothing was ever exported', () => {
    const state = {
      firstSeenAt: '2026-07-25T12:00:00.000Z', // 11 days ago
      lastExportedAt: null,
      dismissedUntil: null,
    }
    expect(backupReminderStatus(state, NOW)).toEqual({
      show: false,
      days: null,
    })
  })

  it('shows with no day count once firstSeenAt crosses the threshold and nothing was ever exported', () => {
    const state = {
      firstSeenAt: '2026-07-20T12:00:00.000Z', // 16 days ago
      lastExportedAt: null,
      dismissedUntil: null,
    }
    expect(backupReminderStatus(state, NOW)).toEqual({
      show: true,
      days: null,
    })
  })

  it('shows the day count once the last export is stale enough', () => {
    const state = {
      firstSeenAt: '2026-01-01T00:00:00.000Z',
      lastExportedAt: '2026-07-18T12:00:00.000Z', // 18 days ago
      dismissedUntil: null,
    }
    expect(backupReminderStatus(state, NOW)).toEqual({
      show: true,
      days: 18,
    })
  })

  it('stays hidden for a recent export', () => {
    const state = {
      firstSeenAt: '2026-01-01T00:00:00.000Z',
      lastExportedAt: '2026-08-01T12:00:00.000Z', // 4 days ago
      dismissedUntil: null,
    }
    expect(backupReminderStatus(state, NOW)).toEqual({
      show: false,
      days: 4,
    })
  })

  it('a live snooze wins even over a very stale backup', () => {
    const state = {
      firstSeenAt: '2026-01-01T00:00:00.000Z',
      lastExportedAt: '2026-01-01T00:00:00.000Z',
      dismissedUntil: '2026-08-06T00:00:00.000Z',
    }
    expect(backupReminderStatus(state, NOW)).toEqual({
      show: false,
      days: null,
    })
  })

  it('shows again once an expired snooze has passed', () => {
    const state = {
      firstSeenAt: '2026-01-01T00:00:00.000Z',
      lastExportedAt: '2026-01-01T00:00:00.000Z',
      dismissedUntil: '2026-08-04T00:00:00.000Z',
    }
    expect(backupReminderStatus(state, NOW)).toEqual({
      show: true,
      days: expect.any(Number),
    })
  })
})
