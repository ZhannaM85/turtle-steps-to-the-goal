import { describe, expect, it } from 'vitest'
import {
  dayPinSortsToTop,
  dayPinSticks,
  daySectionSticks,
  stickyStackTopPx,
  todayCollapseKey,
} from './dayPinPlacement'

describe('day pin sort vs sticky (#1031)', () => {
  it('sorts every pin to the top and sticks only while collapsed', () => {
    expect(dayPinSortsToTop(true)).toBe(true)
    expect(dayPinSortsToTop(false)).toBe(false)
    expect(dayPinSticks(true, false)).toBe(false)
    expect(dayPinSticks(true, true)).toBe(true)
    expect(dayPinSticks(false, true)).toBe(false)
  })

  it('treats an open accordion as not sticky, and a section without one as sticky', () => {
    expect(todayCollapseKey('macros')).toBe('macros')
    expect(todayCollapseKey('sleep')).toBeNull()
    expect(daySectionSticks(false, undefined)).toBe(false)
    expect(daySectionSticks(true, undefined)).toBe(true)
    expect(daySectionSticks(null, undefined)).toBe(true)
    expect(daySectionSticks(true, false)).toBe(false)
  })

  it('stacks collapsed pins under the date chrome', () => {
    expect(stickyStackTopPx(80, [])).toBe(80)
    expect(stickyStackTopPx(80, [48])).toBe(128)
    expect(stickyStackTopPx(80.2, [10.1])).toBe(91)
  })
})
