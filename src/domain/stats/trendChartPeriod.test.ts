import { describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import {
  filterEntriesByTrendChartPeriod,
  resolveTrendChartPeriodRange,
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
