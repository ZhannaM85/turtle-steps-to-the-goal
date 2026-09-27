import { describe, expect, it } from 'vitest'
import { formatNumber, getDictionary } from '@/i18n'
import {
  daySectionScrollTop,
  formatDayKcalStrip,
  kcalStripRootMarginTopPx,
  kcalStripVisible,
  rectIntersectsBand,
  summaryIsBelowStickyChrome,
} from './dayKcalStripModel'

describe('kcal strip (#1022)', () => {
  it('shows the strip only after the full summary leaves the screen', () => {
    expect(
      kcalStripVisible({ hasSummary: true, summaryInView: false }),
    ).toBe(true)
    expect(kcalStripVisible({ hasSummary: true, summaryInView: true })).toBe(
      false,
    )
    expect(
      kcalStripVisible({ hasSummary: false, summaryInView: false }),
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

  it('formats consumed and remaining with locale numbers and compact macros', () => {
    const t = getDictionary('ru')
    const text = formatDayKcalStrip({
      consumedKcal: 1680,
      remainingKcal: -275,
      proteinG: 128,
      fatG: 71,
      carbG: 138,
      locale: 'ru',
      t,
    })
    expect(text.kcal).toBe(
      `${formatNumber(1680, 'ru', 0)} · ${formatNumber(-275, 'ru', 0)} ${t.dailyEntry.kcalUnit}`,
    )
    expect(text.macros).toBe('Б 128г · Ж 71г · У 138г')
  })

  it('omits remaining and macros when they were not logged', () => {
    const t = getDictionary('en')
    const text = formatDayKcalStrip({
      consumedKcal: 500,
      remainingKcal: undefined,
      proteinG: undefined,
      fatG: undefined,
      carbG: undefined,
      locale: 'en',
      t,
    })
    expect(text).toEqual({ kcal: '500 kcal', macros: null })
  })
})
