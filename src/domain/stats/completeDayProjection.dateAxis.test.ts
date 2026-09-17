import { describe, expect, it } from 'vitest'
import { estimateChartDateTickWidthPx, formatLocalizedDate } from '@/i18n'
import {
  COMPLETE_DAY_DATE_AXIS_PLOT_WIDTH_PX,
  completeDayAxisTickIso,
  completeDayAxisTickLabel,
  completeDayHorizonWeeks,
  completeDayLabeledWeekTicks,
  completeDayMiddleWeekTick,
  completeDayProjectionEndIso,
  completeDayWeekGridTicks,
} from './completeDayProjection'

function expectLabeledDatesDoNotOverlap(
  labeled: number[],
  endWeek: number,
  startIso: string,
  formatDate: (iso: string) => string,
  plotWidthPx: number = COMPLETE_DAY_DATE_AXIS_PLOT_WIDTH_PX,
) {
  const lastIndex = labeled.length - 1
  const bounds = labeled.map((week, index) => {
    const label = completeDayAxisTickLabel(week, startIso, formatDate)
    const x = (week / endWeek) * plotWidthPx
    const width = estimateChartDateTickWidthPx(label)
    if (index === 0) return { left: x, right: x + width }
    if (index === lastIndex) return { left: x - width, right: x }
    return { left: x - width / 2, right: x + width / 2 }
  })
  for (let i = 1; i < bounds.length; i += 1) {
    expect(bounds[i]!.left).toBeGreaterThanOrEqual(bounds[i - 1]!.right)
  }
}

describe('complete-the-day date axis (#949 / #953 / #957 / #959)', () => {
  it('maps every grid tick to a PP date, then labels only a non-overlapping subset', () => {
    const formatDate = (iso: string) => formatLocalizedDate(iso, 'en')
    const monthTicks = completeDayWeekGridTicks('month')
    expect(monthTicks).toEqual([0, 1, 2, 3, 4, 30 / 7])
    expect(
      monthTicks.map((week) =>
        completeDayAxisTickLabel(week, '2026-03-01', formatDate),
      ),
    ).toEqual([
      'Mar 1, 2026',
      'Mar 8, 2026',
      'Mar 15, 2026',
      'Mar 22, 2026',
      'Mar 29, 2026',
      'Mar 31, 2026',
    ])
    const labeled = completeDayLabeledWeekTicks(
      'month',
      '2026-03-01',
      formatDate,
    )
    expect(labeled[0]).toBe(0)
    expect(labeled.at(-1)).toBe(30 / 7)
    expect(labeled).toContain(completeDayMiddleWeekTick(monthTicks))
    expect(labeled.length).toBeLessThan(monthTicks.length)
    expect(labeled.length).toBeGreaterThanOrEqual(3)
    expectLabeledDatesDoNotOverlap(labeled, 30 / 7, '2026-03-01', formatDate)
    for (const week of labeled) {
      expect(monthTicks).toContain(week)
      const label = completeDayAxisTickLabel(week, '2026-03-01', formatDate)
      expect(label).toBe(
        formatLocalizedDate(completeDayAxisTickIso('2026-03-01', week), 'en'),
      )
      expect(label).not.toMatch(/^\d{2}\/\d{2}\/\d{4}$/)
      expect(label).not.toMatch(/^\d+$/)
    }
    expect(completeDayAxisTickIso('2026-03-01', 0)).toBe('2026-03-01')
    expect(completeDayAxisTickIso('2026-03-01', 1)).toBe('2026-03-08')
    expect(completeDayAxisTickIso('2026-03-01', 30 / 7)).toBe('2026-03-31')
  })

  it('uses formatLocalizedDate on Week and Year too, never a day-count or US numeric date', () => {
    const formatDate = (iso: string) => formatLocalizedDate(iso, 'en')
    const formatRu = (iso: string) => formatLocalizedDate(iso, 'ru')
    expect(completeDayWeekGridTicks('week')).toEqual([0, 1])
    expect(completeDayAxisTickLabel(0, '2026-03-01', formatDate)).toBe(
      'Mar 1, 2026',
    )
    expect(completeDayAxisTickLabel(1, '2026-03-01', formatDate)).toBe(
      'Mar 8, 2026',
    )
    expect(completeDayAxisTickLabel(0, '2026-03-01', formatRu)).toBe(
      '1 мар. 2026 г.',
    )
    const yearTicks = completeDayWeekGridTicks('year')
    const yearLabeled = completeDayLabeledWeekTicks(
      'year',
      '2026-03-01',
      formatDate,
    )
    expect(yearLabeled[0]).toBe(0)
    expect(yearLabeled.at(-1)).toBe(365 / 7)
    expect(yearLabeled).toContain(completeDayMiddleWeekTick(yearTicks))
    expect(yearLabeled.length).toBeLessThanOrEqual(yearTicks.length)
    expect(yearLabeled.length).toBeGreaterThanOrEqual(3)
    expectLabeledDatesDoNotOverlap(
      yearLabeled,
      365 / 7,
      '2026-03-01',
      formatDate,
    )
    const yearLabels = yearLabeled.map((week) =>
      completeDayAxisTickLabel(week, '2026-03-01', formatDate),
    )
    expect(yearLabels[0]).toBe('Mar 1, 2026')
    expect(yearLabels.at(-1)).toBe('Mar 1, 2027')
    for (const label of yearLabels) {
      expect(label).not.toMatch(/^\d+$/)
      expect(label).not.toMatch(/^\d{2}\/\d{2}\/\d{4}$/)
      expect(label).toMatch(/\d{4}/)
    }
    expect(completeDayAxisTickLabel(3 / 7, '2026-03-01', formatDate)).not.toBe(
      '3',
    )
    expect(completeDayAxisTickLabel(5 / 7, '2026-03-01', formatDate)).not.toBe(
      '5',
    )
  })

  it('labels Month and Year start + mid-range + end without overlap (#959)', () => {
    const formatRu = (iso: string) => formatLocalizedDate(iso, 'ru')
    const formatEn = (iso: string) => formatLocalizedDate(iso, 'en')
    const startIso = '2026-09-16'
    expect(completeDayLabeledWeekTicks('week', startIso, formatRu)).toEqual([
      0, 1,
    ])
    for (const horizon of ['month', 'year'] as const) {
      const ticks = completeDayWeekGridTicks(horizon)
      const endWeek = completeDayHorizonWeeks(horizon)
      const middle = completeDayMiddleWeekTick(ticks)
      expect(middle).toBeDefined()
      for (const formatDate of [formatRu, formatEn]) {
        const labeled = completeDayLabeledWeekTicks(
          horizon,
          startIso,
          formatDate,
        )
        expect(labeled[0]).toBe(0)
        expect(labeled.at(-1)).toBe(endWeek)
        expect(labeled).toContain(middle)
        expect(labeled.length).toBeGreaterThanOrEqual(3)
        expect(labeled.length).toBeLessThanOrEqual(ticks.length)
        expectLabeledDatesDoNotOverlap(labeled, endWeek, startIso, formatDate)
        const labels = labeled.map((week) =>
          completeDayAxisTickLabel(week, startIso, formatDate),
        )
        expect(labels[0]).toBe(formatDate(startIso))
        expect(labels.at(-1)).toBe(
          formatDate(completeDayProjectionEndIso(startIso, horizon)),
        )
        expect(labels[labeled.indexOf(middle!)]).toBe(
          formatDate(completeDayAxisTickIso(startIso, middle!)),
        )
        for (const label of labels) {
          expect(label).toMatch(/\d{4}/)
          expect(label).not.toMatch(/^\d+$/)
          expect(label).not.toMatch(/^\d{2}\/\d{2}\/\d{4}$/)
          expect(label).not.toMatch(/^\d{2}\.\d{2}\.\d{2,4}$/)
        }
      }
    }
  })
})
