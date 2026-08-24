import { describe, expect, it } from 'vitest'
import {
  hasAutoSleepValues,
  parseAutoSleepText,
} from './parseAutoSleepText'

const AUTOSLEEP_TODAY = `
TODAY
SUNDAY 16 → MONDAY 17
10h 33m
Sleep
Quality 7h 59m
Deep 3h 26m
In bed 11:54
Efficiency 89%
HR 70
`

/** #758 — AutoSleep History day tiles (H:MM), not the Today `Xh Ym` summary. */
const AUTOSLEEP_HISTORY = `
SLEEP
Sun Aug 23, 2026
1:53-10:33
Avg. — 7h 45m
Mon 17 10:33
Tue 18 6:09
Wed 19 1:53
Thu 20 3:30
Fri 21 4:47
Sat 22
Sun 23 5:10
RATING 78%
ASLEEP 5:10
QUALITY 4:20
IN BED AT 00:45 → 06:00
DEEP SLEEP 1:48
HEARTRATE 74
`

describe('parseAutoSleepText', () => {
  it('reads sleep, deep sleep, and the wake date from an English AutoSleep Today screen (#748)', () => {
    expect(parseAutoSleepText(AUTOSLEEP_TODAY, '2026-08-17')).toEqual({
      sleepHours: 10.55,
      deepSleepHours: 3.43,
      date: '2026-08-17',
    })
  })

  it('ignores quality hours and in-bed clock time', () => {
    const reading = parseAutoSleepText(AUTOSLEEP_TODAY, '2026-08-17')
    expect(reading.sleepHours).toBe(10.55)
    expect(reading.deepSleepHours).toBe(3.43)
    expect(reading.sleepHours).not.toBe(7.98)
  })

  it('still recovers sleep as the longest duration when labels OCR poorly', () => {
    const text = 'SUNDAY 16 → MONDAY 17\n10h 33m\n3h 26m'
    expect(parseAutoSleepText(text, '2026-08-17')).toEqual({
      sleepHours: 10.55,
      deepSleepHours: 3.43,
      date: '2026-08-17',
    })
  })

  it('hints when the wake morning is not the open day', () => {
    expect(parseAutoSleepText(AUTOSLEEP_TODAY, '2026-08-18').date).toBe(
      '2026-08-17',
    )
  })

  it('returns empty when the text is unrelated', () => {
    const reading = parseAutoSleepText('hello world', '2026-08-17')
    expect(hasAutoSleepValues(reading)).toBe(false)
    expect(reading.date).toBeUndefined()
  })

  it('reads Asleep and Deep sleep from an English AutoSleep History screen (#758)', () => {
    expect(parseAutoSleepText(AUTOSLEEP_HISTORY, '2026-08-24')).toEqual({
      sleepHours: 5.17,
      deepSleepHours: 1.8,
      date: '2026-08-23',
    })
  })

  it('ignores History quality, in-bed, averages, and week chips (#758)', () => {
    const reading = parseAutoSleepText(AUTOSLEEP_HISTORY, '2026-08-24')
    expect(reading.sleepHours).toBe(5.17)
    expect(reading.deepSleepHours).toBe(1.8)
    expect(reading.sleepHours).not.toBe(7.75)
    expect(reading.deepSleepHours).not.toBe(4.33)
  })
})
