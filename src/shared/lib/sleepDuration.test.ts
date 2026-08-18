import { describe, expect, it } from 'vitest'
import {
  combineHoursMinutes,
  formatSleepDuration,
  splitHoursMinutes,
} from './sleepDuration'

describe('splitHoursMinutes', () => {
  it('returns blank strings for undefined', () => {
    expect(splitHoursMinutes(undefined)).toEqual({ hours: '', minutes: '' })
  })

  it('splits a whole-hour value with zero minutes', () => {
    expect(splitHoursMinutes(7)).toEqual({ hours: '7', minutes: '0' })
  })

  it('splits a fractional-hour value into whole hours and minutes', () => {
    expect(splitHoursMinutes(7.5)).toEqual({ hours: '7', minutes: '30' })
  })

  it('rounds minutes to the nearest whole number', () => {
    expect(splitHoursMinutes(2.383)).toEqual({ hours: '2', minutes: '23' })
  })
})

describe('combineHoursMinutes', () => {
  it('returns undefined when both parts are blank', () => {
    expect(combineHoursMinutes('', '')).toBeUndefined()
  })

  it('treats a missing part as zero', () => {
    expect(combineHoursMinutes('8', '')).toBe(8)
    expect(combineHoursMinutes('', '30')).toBe(0.5)
  })

  it('combines whole hours and minutes into decimal hours', () => {
    expect(combineHoursMinutes('10', '33')).toBe(10.55)
    expect(combineHoursMinutes('3', '26')).toBe(3 + 26 / 60)
  })
})

describe('formatSleepDuration', () => {
  it('composes hours and minutes with their own units (#358)', () => {
    expect(formatSleepDuration(9.383, 'h', 'm')).toBe('9h 23m')
  })

  it('uses whichever unit strings are passed in (locale-specific)', () => {
    expect(formatSleepDuration(7.5, 'ч', 'м')).toBe('7ч 30м')
  })

  it('still renders a 0m suffix for a whole-hour value', () => {
    expect(formatSleepDuration(8, 'h', 'm')).toBe('8h 0m')
  })
})
