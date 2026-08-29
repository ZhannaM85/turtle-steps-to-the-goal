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

  it('still reads Asleep and Deep when OCR concatenates the History grid (#758)', () => {
    const text = `
SLEEP Sun Aug 23, 2026 1:53-10:33
Avg. — 7h 45m
RATING 78% ASLEEP 5:10 QUALITY 4:20
IN BED AT 00:45 → 06:00 DEEP SLEEP 1:48 HEARTRATE 74
`
    expect(parseAutoSleepText(text, '2026-08-24')).toEqual({
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

  it('reads Asleep 5:10 and Deep 1:48 from inverted-threshold History OCR (#758)', () => {
    const text = `
21:28 we &
SLEEP Sun Aug 23, 2026
1:53-10:33 Avg. —7h 45m
v7 18 19 20 a 22 BE
10:33 6:09 «1:53 3:30 sa 5:10
24
00:45 :
> 06:00 1:48 74
Today Clock History Settings
`
    expect(parseAutoSleepText(text, '2026-08-24')).toEqual({
      sleepHours: 5.17,
      deepSleepHours: 1.8,
      date: '2026-08-23',
    })
  })

  it('reads Asleep from 78% | 5:10 | 4:20 after invert (#758)', () => {
    const text = `
SLEEP Sun Aug 23, 2026
78% | 5:10 | 4:20
00:45
> 06:00 1:48 74
`
    expect(parseAutoSleepText(text, '2026-08-24')).toMatchObject({
      sleepHours: 5.17,
      deepSleepHours: 1.8,
      date: '2026-08-23',
    })
  })

  it('reads Deep 3h10m from Today OCR even when status bar has 1:00 (#762)', () => {
    // Real eng Tesseract text from the on-device AutoSleep Today shot
    // (WEDNESDAY 26 → THURSDAY 27): Sleep Rating shows icon-only
    // 8h29m / 7h24m / 3h10m; status bar OCR starts with `1:00`.
    const text = `
1:00 6B oe 22 7
WEDNESDAY 26 > THURSDAY 27
8h 29m G
Sleep Efficiency: 95%.
Sleep Session
AWAKE
DEEP ne ob 1 on
00:46 - 09:39 € 8:29 / 8:53
Time Asleep Sleep Rating
TODAY &€8h29m
8h 29m 7h 24m
SLEEP BANK @®3h10m
18,9% Credit 073
`
    expect(parseAutoSleepText(text, '2026-08-27')).toEqual({
      sleepHours: 8.48,
      deepSleepHours: 3.17,
      date: '2026-08-27',
    })
  })

  it('reads Deep 0h 45m from Sleep Rating, not star 7h 10m (#771)', () => {
    const text = `
FRIDAY 28 > SATURDAY 29
9h 22m
Sleep Efficiency: 93%.
AWAKE LIGHT STILL DEEP
23:42 - 09:45
Time Asleep Sleep Rating
TODAY 9h 22m
9h 22m 7h 10m 0h 45m
73
`
    expect(parseAutoSleepText(text, '2026-08-29')).toEqual({
      sleepHours: 9.37,
      deepSleepHours: 0.75,
      date: '2026-08-29',
    })
  })

  it('does not take hypnogram DEEP glued to 7h 10m as deep sleep (#771)', () => {
    const text = `
SATURDAY 29
DEEP 7h 10m
9h 22m
0h 45m
`
    expect(parseAutoSleepText(text, '2026-08-29')).toMatchObject({
      sleepHours: 9.37,
      deepSleepHours: 0.75,
    })
  })

  it('still reads 0h 45m when OCR glues it onto the Sleep Rating title (#771)', () => {
    const text = `
FRIDAY 28 > SATURDAY 29
9h 22m
Sleep Efficiency: 93%.
Time Asleep Sleep Rating 9h 22m 7h 10m 0h 45m
TODAY 9h 22m
`
    expect(parseAutoSleepText(text, '2026-08-29')).toMatchObject({
      sleepHours: 9.37,
      deepSleepHours: 0.75,
    })
  })

  it('leaves deep empty when Sleep Rating has no z-icon duration (#772)', () => {
    const text = `
SATURDAY 29
TODAY 9h 22m
9h 22m 7h 10m
`
    const reading = parseAutoSleepText(text, '2026-08-29')
    expect(reading.sleepHours).toBe(9.37)
    expect(reading.deepSleepHours).toBeUndefined()
  })
})
