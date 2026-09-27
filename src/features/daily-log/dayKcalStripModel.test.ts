import { describe, expect, it } from 'vitest'
import { getDictionary } from '@/i18n'
import {
  daySectionScrollTop,
  formatDayKcalStrip,
  kcalStripRootMarginTopPx,
  kcalStripVisible,
  rectIntersectsBand,
  summaryIsBelowStickyChrome,
} from './dayKcalStripModel'

describe('kcal strip (#1022)', () => {
  it('shows the strip only after a collapsed summary leaves the screen (#1029)', () => {
    expect(
      kcalStripVisible({
        hasSummary: true,
        summaryInView: false,
        collapsed: true,
      }),
    ).toBe(true)
    expect(
      kcalStripVisible({
        hasSummary: true,
        summaryInView: true,
        collapsed: true,
      }),
    ).toBe(false)
    expect(
      kcalStripVisible({
        hasSummary: true,
        summaryInView: false,
        collapsed: false,
      }),
    ).toBe(false)
    expect(
      kcalStripVisible({
        hasSummary: false,
        summaryInView: false,
        collapsed: true,
      }),
    ).toBe(false)
  })

  it('treats a pinned summary inside the sticky header as on screen', () => {
    expect(
      rectIntersectsBand({ top: 80, bottom: 240 }, { top: 0, bottom: 700 }),
    ).toBe(true)
    expect(
      rectIntersectsBand({ top: -200, bottom: -20 }, { top: 0, bottom: 700 }),
    ).toBe(false)
  })

  it('observes below the full sticky intro, including the strip', () => {
    expect(kcalStripRootMarginTopPx(120)).toBe(120)
    expect(kcalStripRootMarginTopPx(0)).toBe(0)
  })

  it('keeps a summary that just left the screen hidden after the strip mounts (#1025)', () => {
    const chrome = 120
    const growth = 38
    const gap = 1
    const edgeBefore = kcalStripRootMarginTopPx(chrome)
    const summaryBottomBefore = edgeBefore - gap
    expect(summaryBottomBefore > edgeBefore).toBe(false)

    const edgeAfter = kcalStripRootMarginTopPx(chrome + growth)
    const summaryBottomAfter = summaryBottomBefore + growth
    expect(edgeAfter - edgeBefore).toBe(growth)
    expect(
      summaryIsBelowStickyChrome({
        summaryBottom: summaryBottomAfter,
        chromeBottom: edgeAfter,
      }),
    ).toBe(false)
  })

  it('scrolls the summary to just under the sticky chrome', () => {
    expect(
      daySectionScrollTop({
        scrollTop: 400,
        sectionTop: 500,
        scrollerTop: 40,
        introHeight: 120,
      }),
    ).toBe(400 + 500 - 40 - 120)
  })

  it('formats consumed kcal with the unit right after the number (#1033)', () => {
    const t = getDictionary('ru')
    const text = formatDayKcalStrip({
      consumedKcal: 640,
      proteinG: 31,
      fatG: 30,
      carbG: 63,
      locale: 'ru',
      t,
    })
    expect(text.kcal).toBe(`640 ${t.dailyEntry.kcalUnit}`)
    expect(text.macros).toBe('Б 31г · Ж 30г · У 63г')
  })

  it('omits macros when they were not logged', () => {
    const t = getDictionary('en')
    const text = formatDayKcalStrip({
      consumedKcal: 500,
      proteinG: undefined,
      fatG: undefined,
      carbG: undefined,
      locale: 'en',
      t,
    })
    expect(text).toEqual({ kcal: '500 kcal', macros: null })
  })
})
