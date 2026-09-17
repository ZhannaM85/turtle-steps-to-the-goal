import { describe, expect, it } from 'vitest'
import {
  CHART_DATE_TICK_MIN_GAP_PX,
  formatLocalizedDate,
  formatLocalizedDateRange,
  formatLocalizedShortDate,
  estimateChartDateTickWidthPx,
  selectNonOverlappingDateTicks,
} from './dateLocale'

describe('formatLocalizedDate', () => {
  it('formats ISO dates with English month names', () => {
    expect(formatLocalizedDate('2026-09-13', 'en')).toBe('Sep 13, 2026')
  })

  it('formats ISO dates with Russian month names (#882)', () => {
    expect(formatLocalizedDate('2026-09-13', 'ru')).toBe('13 сент. 2026 г.')
  })

  it('does not use US numeric or dotted short dates (#957)', () => {
    expect(formatLocalizedDate('2026-09-16', 'en')).not.toMatch(
      /^\d{2}\/\d{2}\/\d{4}$/,
    )
    expect(formatLocalizedDate('2026-09-16', 'ru')).not.toMatch(
      /^\d{2}\.\d{2}\.\d{2,4}$/,
    )
  })

  it('returns empty for missing or invalid values', () => {
    expect(formatLocalizedDate('', 'en')).toBe('')
    expect(formatLocalizedDate('not-a-date', 'en')).toBe('')
    expect(formatLocalizedDate('2026-13-40', 'en')).toBe('')
  })
})

describe('formatLocalizedShortDate (#957)', () => {
  it('uses the same PP helper as formatLocalizedDate, not a numeric one-off', () => {
    expect(formatLocalizedShortDate('2026-03-01', 'en')).toBe(
      formatLocalizedDate('2026-03-01', 'en'),
    )
    expect(formatLocalizedShortDate('2026-03-01', 'ru')).toBe(
      formatLocalizedDate('2026-03-01', 'ru'),
    )
    expect(formatLocalizedShortDate('2026-03-01', 'en')).toBe('Mar 1, 2026')
    expect(formatLocalizedShortDate('2026-03-01', 'ru')).toBe('1 мар. 2026 г.')
    expect(formatLocalizedShortDate('2026-03-01', 'en')).not.toBe('03/01/2026')
    expect(formatLocalizedShortDate('2026-03-01', 'ru')).not.toBe('01.03.2026')
    expect(formatLocalizedShortDate('2026-03-01', 'en')).not.toMatch(/^\d+$/)
  })

  it('returns empty for missing or invalid values', () => {
    expect(formatLocalizedShortDate('', 'en')).toBe('')
    expect(formatLocalizedShortDate('not-a-date', 'en')).toBe('')
    expect(formatLocalizedShortDate('2026-13-40', 'en')).toBe('')
  })
})

describe('formatLocalizedDateRange (#957)', () => {
  it('joins two PP dates with an en dash', () => {
    expect(
      formatLocalizedDateRange('2026-07-22', '2026-07-28', 'en'),
    ).toBe('Jul 22, 2026 – Jul 28, 2026')
    expect(
      formatLocalizedDateRange('2026-09-11', '2026-09-17', 'ru'),
    ).toBe('11 сент. 2026 г. – 17 сент. 2026 г.')
  })
})

describe('selectNonOverlappingDateTicks (#957)', () => {
  it('always keeps a single tick and both endpoints', () => {
    expect(
      selectNonOverlappingDateTicks(['a'], {
        getLabel: () => 'Sep 12, 2026',
        getX: () => 0,
      }),
    ).toEqual(['a'])
    expect(
      selectNonOverlappingDateTicks(['a', 'b'], {
        getLabel: () => 'Sep 12, 2026',
        getX: (tick) => (tick === 'a' ? 0 : 260),
      }),
    ).toEqual(['a', 'b'])
  })

  it('drops interior ticks whose PP labels would overlap', () => {
    const ticks = [0, 1, 2, 3, 4, 4.29]
    const selected = selectNonOverlappingDateTicks(ticks, {
      getLabel: () => 'Sep 12, 2026',
      getX: (week) => (week / 4.29) * 260,
    })
    expect(selected[0]).toBe(0)
    expect(selected.at(-1)).toBe(4.29)
    expect(selected.length).toBeLessThan(ticks.length)
    expect(selected.length).toBeGreaterThanOrEqual(2)
  })

  it('keeps more ticks when the plot is wide enough', () => {
    const ticks = [0, 1, 2]
    const selected = selectNonOverlappingDateTicks(ticks, {
      getLabel: () => 'Mar 1, 2026',
      getX: (week) => week * 200,
    })
    expect(selected).toEqual([0, 1, 2])
  })

  it('leaves a readable gap between consecutive selected labels', () => {
    const ticks = [0, 1, 2, 3, 4, 30 / 7]
    const end = 30 / 7
    const plotWidth = 260
    const selected = selectNonOverlappingDateTicks(ticks, {
      getLabel: () => '13 сент. 2026 г.',
      getX: (week) => (week / end) * plotWidth,
    })
    const width = estimateChartDateTickWidthPx('13 сент. 2026 г.')
    for (let i = 1; i < selected.length; i += 1) {
      const prevX = (selected[i - 1]! / end) * plotWidth
      const x = (selected[i]! / end) * plotWidth
      const prevRight =
        i - 1 === 0 ? prevX + width : prevX + width / 2
      const left =
        i === selected.length - 1 ? x - width : x - width / 2
      expect(left).toBeGreaterThanOrEqual(prevRight)
    }
  })

  it('uses a min tick gap large enough for a PP label', () => {
    expect(CHART_DATE_TICK_MIN_GAP_PX).toBeGreaterThanOrEqual(80)
  })
})
