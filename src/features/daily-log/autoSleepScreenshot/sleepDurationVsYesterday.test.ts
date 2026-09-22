import { describe, expect, it } from 'vitest'
import { sleepDurationVsYesterday } from './sleepDurationVsYesterday'

describe('sleepDurationVsYesterday (#976)', () => {
  it('returns a higher-is-better increase in whole minutes', () => {
    expect(sleepDurationVsYesterday(6 + 8 / 60, 5 + 56 / 60)).toEqual({
      direction: 'up',
      tone: 'good',
      absHours: 12 / 60,
    })
  })

  it('returns a decrease when the scanned night is shorter', () => {
    expect(sleepDurationVsYesterday(1 + 13 / 60, 1 + 33 / 60)).toEqual({
      direction: 'down',
      tone: 'bad',
      absHours: 20 / 60,
    })
  })

  it('returns null when yesterday has no value for the metric', () => {
    expect(sleepDurationVsYesterday(6 + 8 / 60, undefined)).toBeNull()
  })

  it('treats a saved zero as real data, not a missing night', () => {
    expect(sleepDurationVsYesterday(6 + 8 / 60, 0)).toEqual({
      direction: 'up',
      tone: 'good',
      absHours: 6 + 8 / 60,
    })
  })

  it('returns null when the nights match to the minute', () => {
    expect(sleepDurationVsYesterday(10.55, 10 + 33 / 60)).toBeNull()
  })

  it('ignores a sub-minute float difference', () => {
    expect(sleepDurationVsYesterday(7.0004, 7)).toBeNull()
  })
})
