import { describe, expect, it } from 'vitest'
import { OVERNIGHT_WRAP_BEFORE_MINUTES, adjustForDayStart } from './dayStart'

describe('adjustForDayStart', () => {
  it('leaves a time at or after 06:00 unchanged', () => {
    expect(adjustForDayStart(10 * 60)).toBe(10 * 60)
    expect(adjustForDayStart(OVERNIGHT_WRAP_BEFORE_MINUTES)).toBe(6 * 60)
  })

  it('shifts a past-midnight time forward by a full day', () => {
    const snack = 1 * 60 + 22
    expect(adjustForDayStart(snack)).toBe(snack + 24 * 60)
  })

  it('keeps a morning breakfast before lunch (#755)', () => {
    const breakfast = 8 * 60 + 27
    const lunch = 11 * 60
    expect(adjustForDayStart(breakfast)).toBe(breakfast)
    expect(adjustForDayStart(lunch)).toBe(lunch)
    expect(adjustForDayStart(breakfast)).toBeLessThan(adjustForDayStart(lunch))
  })
})
