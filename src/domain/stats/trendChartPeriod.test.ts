import { format } from 'date-fns'
import { describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import { formatLocalizedDate } from '@/i18n'
import {
  filterEntriesByTrendChartPeriod,
  resolveTrendChartPeriodRange,
  throughNowDateForTrendChart,
} from './trendChartPeriod'

const TODAY = new Date('2026-07-28T00:00:00.000Z')

function entry(date: string): DailyEntry {
  const now = '2026-01-01T00:00:00.000Z'
  return { id: date, date, createdAt: now, updatedAt: now }
}

describe('resolveTrendChartPeriodRange', () => {
  it("returns an unbounded range for 'all'", () => {
    expect(resolveTrendChartPeriodRange('all', '', '', TODAY)).toEqual({
      start: null,
      end: null,
    })
  })

  it("resolves 'week' to the last 7 days including today", () => {
    expect(resolveTrendChartPeriodRange('week', '', '', TODAY)).toEqual({
      start: '2026-07-22',
      end: '2026-07-28',
    })
  })

  it("resolves 'month' to the last 30 days including today", () => {
    expect(resolveTrendChartPeriodRange('month', '', '', TODAY)).toEqual({
      start: '2026-06-29',
      end: '2026-07-28',
    })
  })

  it("resolves 'year' to the last 365 days including today", () => {
    expect(resolveTrendChartPeriodRange('year', '', '', TODAY)).toEqual({
      start: '2025-07-29',
      end: '2026-07-28',
    })
  })

  it("uses the given custom start/end for 'custom'", () => {
    expect(
      resolveTrendChartPeriodRange('custom', '2026-01-01', '2026-02-01', TODAY),
    ).toEqual({ start: '2026-01-01', end: '2026-02-01' })
  })

  it('treats a blank custom side as unbounded, same as the export period picker (#240)', () => {
    expect(
      resolveTrendChartPeriodRange('custom', '2026-01-01', '', TODAY),
    ).toEqual({ start: '2026-01-01', end: null })
    expect(
      resolveTrendChartPeriodRange('custom', '', '2026-02-01', TODAY),
    ).toEqual({ start: null, end: '2026-02-01' })
  })

  // #975 — 21 Sept 2026 local morning; Week/Month/Year end on that day.
  const LOCAL_21_SEPT = new Date(2026, 8, 21, 9, 51, 0)

  it("#975 resolves 'week' through 21 Sept 2026, not yesterday", () => {
    const range = resolveTrendChartPeriodRange('week', '', '', LOCAL_21_SEPT)
    expect(range).toEqual({ start: '2026-09-15', end: '2026-09-21' })
    expect(formatLocalizedDate(range.end!, 'ru')).toBe(
      formatLocalizedDate('2026-09-21', 'ru'),
    )
  })

  it("#975 resolves 'month' through 21 Sept 2026, not yesterday", () => {
    const range = resolveTrendChartPeriodRange('month', '', '', LOCAL_21_SEPT)
    expect(range).toEqual({ start: '2026-08-23', end: '2026-09-21' })
    expect(formatLocalizedDate(range.end!, 'ru')).toBe(
      formatLocalizedDate('2026-09-21', 'ru'),
    )
  })

  it("#975 resolves 'year' through 21 Sept 2026, not yesterday", () => {
    expect(
      resolveTrendChartPeriodRange('year', '', '', LOCAL_21_SEPT),
    ).toEqual({ start: '2025-09-22', end: '2026-09-21' })
  })
})

describe('throughNowDateForTrendChart (#975)', () => {
  it('uses the local calendar morning even when day-start is later the same day', () => {
    const now = new Date(2026, 8, 21, 9, 51, 0)
    expect(format(throughNowDateForTrendChart(now, '10:00'), 'yyyy-MM-dd')).toBe(
      '2026-09-21',
    )
  })

  it('keeps overnight before 06:00 on the day-start logical day (#625)', () => {
    const now = new Date(2026, 7, 3, 1, 0, 0)
    expect(format(throughNowDateForTrendChart(now, '04:00'), 'yyyy-MM-dd')).toBe(
      '2026-08-02',
    )
  })

  it("honors 'Start today's log now' even overnight", () => {
    const now = new Date(2026, 8, 21, 1, 0, 0)
    expect(
      format(throughNowDateForTrendChart(now, '04:00', '2026-09-21'), 'yyyy-MM-dd'),
    ).toBe('2026-09-21')
  })
})

describe('filterEntriesByTrendChartPeriod', () => {
  it('returns everything unchanged when both bounds are null', () => {
    const entries = [entry('2020-01-01'), entry('2026-07-28')]
    expect(
      filterEntriesByTrendChartPeriod(entries, { start: null, end: null }),
    ).toEqual(entries)
  })

  it('filters to an inclusive [start, end] range', () => {
    const entries = [
      entry('2026-07-01'),
      entry('2026-07-15'),
      entry('2026-07-22'),
      entry('2026-07-28'),
      entry('2026-08-01'),
    ]
    const result = filterEntriesByTrendChartPeriod(entries, {
      start: '2026-07-22',
      end: '2026-07-28',
    })
    expect(result.map((e) => e.date)).toEqual(['2026-07-22', '2026-07-28'])
  })

  it('treats a one-sided bound as unbounded on the other side', () => {
    const entries = [
      entry('2026-07-01'),
      entry('2026-07-15'),
      entry('2026-07-28'),
    ]
    expect(
      filterEntriesByTrendChartPeriod(entries, {
        start: '2026-07-15',
        end: null,
      }).map((e) => e.date),
    ).toEqual(['2026-07-15', '2026-07-28'])
  })
})
