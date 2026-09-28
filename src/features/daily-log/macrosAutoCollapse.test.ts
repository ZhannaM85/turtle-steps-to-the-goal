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
  autoCollapsed?: boolean
  stickLine?: number
}) {
  return nextMacrosAutoCollapse({
    armed: input.armed ?? false,
    downwardPx: input.downwardPx ?? 0,
    scrollDelta: input.scrollDelta,
    sectionTop: input.sectionTop,
    chromeBottom,
    autoCollapsed: input.autoCollapsed,
    stickLine: input.stickLine,
  })
}

describe('auto-collapse expanded Day КБЖУ (#1036)', () => {
  it('arms while the header is still under the sticky chrome and does not collapse', () => {
    expect(step({ scrollDelta: 0, sectionTop: chromeBottom + 40 })).toEqual({
      armed: true,
      collapse: false,
      expand: false,
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
      expand: false,
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
    expect(back).toEqual({
      armed: true,
      collapse: false,
      expand: false,
      downwardPx: 0,
    })
  })
})

describe('auto-expand Day КБЖУ after an automatic collapse (#1038)', () => {
  const release = chromeBottom + MACROS_AUTO_COLLAPSE_HYSTERESIS_PX

  it('does not expand inside the hysteresis band under the stick line', () => {
    expect(
      step({
        autoCollapsed: true,
        scrollDelta: -12,
        sectionTop: release - 1,
      }),
    ).toMatchObject({ expand: false, collapse: false })
  })

  it('expands once an upward scroll carries the header past the stick line', () => {
    expect(
      step({
        autoCollapsed: true,
        scrollDelta: -8,
        sectionTop: release,
      }),
    ).toEqual({ armed: true, collapse: false, expand: true, downwardPx: 0 })
  })

  it('does not expand from a layout measurement or a further scroll down', () => {
    expect(
      step({ autoCollapsed: true, scrollDelta: 0, sectionTop: release + 40 }),
    ).toMatchObject({ expand: false })
    expect(
      step({ autoCollapsed: true, scrollDelta: 16, sectionTop: release + 40 }),
    ).toMatchObject({ expand: false })
  })

  it('waits for the section’s own stick line when a pin is stacked lower', () => {
    const stickLine = chromeBottom + 60
    const ownRelease = stickLine + MACROS_AUTO_COLLAPSE_HYSTERESIS_PX
    expect(
      step({
        autoCollapsed: true,
        scrollDelta: -10,
        sectionTop: ownRelease - 1,
        stickLine,
      }).expand,
    ).toBe(false)
    expect(
      step({
        autoCollapsed: true,
        scrollDelta: -10,
        sectionTop: ownRelease,
        stickLine,
      }).expand,
    ).toBe(true)
  })
})
