import { describe, expect, it } from 'vitest'
import { currentWeekInfo } from './currentWeekInfo'

describe('currentWeekInfo', () => {
  it('is Week 1 with the current ISO week range when there is no earliest entry yet', () => {
    // Thursday, 2026-03-05 -> ISO week 2026-03-02 (Mon) .. 2026-03-08 (Sun)
    const today = new Date('2026-03-05T12:00:00.000Z')

    const info = currentWeekInfo(today, undefined)

    expect(info).toEqual({
      weekNumber: 1,
      weekStart: '2026-03-02',
      weekEnd: '2026-03-08',
    })
  })

  it('is Week 1 when today is in the same ISO week as the earliest entry', () => {
    const today = new Date('2026-03-05T12:00:00.000Z')

    const info = currentWeekInfo(today, '2026-03-02')

    expect(info.weekNumber).toBe(1)
  })

  it('counts forward by ISO week from the earliest entry', () => {
    const today = new Date('2026-03-19T12:00:00.000Z') // 3 ISO weeks after 2026-03-02

    const info = currentWeekInfo(today, '2026-03-02')

    expect(info.weekNumber).toBe(3)
    expect(info.weekStart).toBe('2026-03-16')
    expect(info.weekEnd).toBe('2026-03-22')
  })

  it('is unaffected by which day of the earliest week the first entry landed on', () => {
    const today = new Date('2026-03-09T12:00:00.000Z') // Monday of ISO week 2

    // First entry logged on a Sunday, still counts as week-1's anchor.
    const info = currentWeekInfo(today, '2026-03-08')

    expect(info.weekNumber).toBe(2)
  })

  it('anchors to a non-Monday weekStartsOn (#85)', () => {
    // First entry on a Wednesday; weeks should run Wed-Tue, not Mon-Sun.
    const today = new Date('2026-03-04T12:00:00.000Z') // same Wednesday
    const info = currentWeekInfo(today, '2026-03-04', 3)

    expect(info).toEqual({
      weekNumber: 1,
      weekStart: '2026-03-04',
      weekEnd: '2026-03-10',
    })
  })

  it('counts forward by the custom weekStartsOn from the earliest entry (#85)', () => {
    const today = new Date('2026-03-11T12:00:00.000Z') // following Wednesday
    const info = currentWeekInfo(today, '2026-03-04', 3)

    expect(info.weekNumber).toBe(2)
    expect(info.weekStart).toBe('2026-03-11')
  })
})
