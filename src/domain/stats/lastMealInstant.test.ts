import { describe, expect, it } from 'vitest'
import {
  clockOnDayToDate,
  elapsedParts,
  gapsSincePreviousMeal,
  lastMealClock,
  resolveLastMealInstant,
} from './lastMealInstant'

describe('lastMealInstant (#791)', () => {
  it('picks the latest clock on a day', () => {
    expect(
      lastMealClock(
        [{ timeEaten: '12:00' }, { timeEaten: '18:52' }, { timeEaten: '08:10' }],
        '00:00',
      ),
    ).toBe('18:52')
  })

  it('uses today when today has a meal', () => {
    const instant = resolveLastMealInstant({
      todayDate: '2026-08-30',
      todayEntries: [{ timeEaten: '18:52' }],
      previousDate: '2026-08-29',
      previousEntries: [{ timeEaten: '21:00' }],
      dayStartTime: '00:00',
    })
    expect(instant).toEqual(new Date(2026, 7, 30, 18, 52, 0, 0))
  })

  it('falls back to yesterday when today has no timed meal', () => {
    const instant = resolveLastMealInstant({
      todayDate: '2026-08-30',
      todayEntries: [],
      previousDate: '2026-08-29',
      previousEntries: [{ timeEaten: '21:00' }],
      dayStartTime: '00:00',
    })
    expect(instant).toEqual(new Date(2026, 7, 29, 21, 0, 0, 0))
  })

  it('places a post-midnight tail on the next calendar day', () => {
    expect(clockOnDayToDate('2026-08-30', '01:15', '04:00')).toEqual(
      new Date(2026, 7, 31, 1, 15, 0, 0),
    )
  })

  it('does not wrap a morning breakfast before a late day-start (#755)', () => {
    expect(clockOnDayToDate('2026-08-30', '08:27', '10:00')).toEqual(
      new Date(2026, 7, 30, 8, 27, 0, 0),
    )
  })

  it('splits elapsed time into hours, minutes, and seconds', () => {
    const from = new Date(2026, 7, 30, 10, 0, 0, 0)
    const now = new Date(2026, 7, 30, 12, 14, 8, 0)
    expect(elapsedParts(from, now)).toEqual({
      hours: 2,
      minutes: 14,
      seconds: 8,
    })
  })

  it('clamps a future last-meal clock to zero', () => {
    const from = new Date(2026, 7, 30, 18, 0, 0, 0)
    const now = new Date(2026, 7, 30, 12, 0, 0, 0)
    expect(elapsedParts(from, now)).toEqual({
      hours: 0,
      minutes: 0,
      seconds: 0,
    })
  })
})

describe('gapsSincePreviousMeal (#792)', () => {
  it('uses yesterday for the first meal and the prior meal for later ones', () => {
    expect(
      gapsSincePreviousMeal(
        [{ timeEaten: '08:00' }, { timeEaten: '10:30' }],
        '2026-08-30',
        '2026-08-29',
        [{ timeEaten: '22:00' }],
        '00:00',
      ),
    ).toEqual([
      { hours: 10, minutes: 0, seconds: 0 },
      { hours: 2, minutes: 30, seconds: 0 },
    ])
  })

  it('skips an untimed meal as a predecessor', () => {
    expect(
      gapsSincePreviousMeal(
        [{}, { timeEaten: '12:00' }],
        '2026-08-30',
        '2026-08-29',
        [{ timeEaten: '20:00' }],
        '00:00',
      ),
    ).toEqual([
      null,
      { hours: 16, minutes: 0, seconds: 0 },
    ])
  })

  it('returns null when there is no previous timed meal', () => {
    expect(
      gapsSincePreviousMeal(
        [{ timeEaten: '08:00' }],
        '2026-08-30',
        '2026-08-29',
        undefined,
        '00:00',
      ),
    ).toEqual([null])
  })
})
