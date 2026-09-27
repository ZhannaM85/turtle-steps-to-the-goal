import { describe, expect, it } from 'vitest'
import {
  MACROS_AUTO_COLLAPSE_HYSTERESIS_PX,
  nextMacrosAutoCollapse,
} from './macrosAutoCollapse'

const chromeBottom = 80

function step(input: {
  armed?: boolean
  downwardPx?: number
  scrollDelta: number
  sectionTop: number
}) {
  return nextMacrosAutoCollapse({
    armed: input.armed ?? false,
    downwardPx: input.downwardPx ?? 0,
    scrollDelta: input.scrollDelta,
    sectionTop: input.sectionTop,
    chromeBottom,
  })
}

describe('auto-collapse expanded Day КБЖУ (#1036)', () => {
  it('arms while the header is still under the sticky chrome and does not collapse', () => {
    expect(step({ scrollDelta: 0, sectionTop: chromeBottom + 40 })).toEqual({
      armed: true,
      collapse: false,
      downwardPx: 0,
    })
    expect(
      step({ armed: true, scrollDelta: 12, sectionTop: chromeBottom + 8 }),
    ).toMatchObject({ armed: true, collapse: false })
  })

  it('does not collapse inside the hysteresis band', () => {
    const inside = chromeBottom - MACROS_AUTO_COLLAPSE_HYSTERESIS_PX + 8
    expect(
      step({ armed: true, scrollDelta: 20, sectionTop: inside }),
    ).toMatchObject({ armed: true, collapse: false })
  })

  it('collapses once a downward scroll carries an in-view header past the band', () => {
    const past = chromeBottom - MACROS_AUTO_COLLAPSE_HYSTERESIS_PX - 1
    expect(step({ armed: true, scrollDelta: 6, sectionTop: past })).toEqual({
      armed: false,
      collapse: true,
      downwardPx: 0,
    })
  })

  it('does not collapse on scroll up, even past the band', () => {
    const past = chromeBottom - MACROS_AUTO_COLLAPSE_HYSTERESIS_PX - 20
    expect(
      step({ armed: true, downwardPx: 40, scrollDelta: -16, sectionTop: past }),
    ).toMatchObject({ collapse: false, armed: true })
  })

  it('does not collapse from a layout measurement with no scroll', () => {
    const past = chromeBottom - 200
    expect(step({ armed: true, scrollDelta: 0, sectionTop: past })).toMatchObject({
      collapse: false,
      armed: true,
    })
  })

  it('keeps a section that was opened already past the line until the user scrolls down', () => {
    const past = chromeBottom - 200
    const opened = step({ armed: false, scrollDelta: 0, sectionTop: past })
    expect(opened.collapse).toBe(false)
    expect(opened.armed).toBe(false)

    const short = step({
      armed: false,
      downwardPx: opened.downwardPx,
      scrollDelta: MACROS_AUTO_COLLAPSE_HYSTERESIS_PX - 1,
      sectionTop: past,
    })
    expect(short.collapse).toBe(false)

    expect(
      step({
        armed: false,
        downwardPx: short.downwardPx,
        scrollDelta: 2,
        sectionTop: past,
      }).collapse,
    ).toBe(true)
  })

  it('cancels a downward jiggle that scrolls back up before the hysteresis', () => {
    const past = chromeBottom - 200
    const down = step({
      armed: false,
      scrollDelta: 20,
      sectionTop: past,
    })
    expect(down.collapse).toBe(false)
    const back = step({
      armed: false,
      downwardPx: down.downwardPx,
      scrollDelta: -20,
      sectionTop: past,
    })
    expect(back.downwardPx).toBe(0)
    expect(
      step({
        armed: false,
        downwardPx: back.downwardPx,
        scrollDelta: 20,
        sectionTop: past,
      }).collapse,
    ).toBe(false)
  })

  it('arms again after the header returns under the chrome, without expanding', () => {
    const back = step({
      armed: false,
      downwardPx: 80,
      scrollDelta: -40,
      sectionTop: chromeBottom + 4,
    })
    expect(back).toEqual({ armed: true, collapse: false, downwardPx: 0 })
  })
})
