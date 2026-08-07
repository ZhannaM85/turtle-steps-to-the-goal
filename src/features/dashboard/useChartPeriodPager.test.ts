import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import { useDayStartStore } from '@/stores'
import { useChartPeriodPager } from './useChartPeriodPager'

const TODAY = new Date('2026-07-28T00:00:00.000Z')

function entry(date: string): DailyEntry {
  const now = '2026-01-01T00:00:00.000Z'
  return { id: date, date, createdAt: now, updatedAt: now }
}

describe('useChartPeriodPager', () => {
  it("does not page for 'all' -- passthrough, matching every pre-#443 caller", () => {
    const entries = [entry('2020-01-01'), entry('2026-07-28')]
    const { result } = renderHook(() =>
      useChartPeriodPager('all', '', '', entries, TODAY),
    )

    expect(result.current.showPager).toBe(false)
    expect(result.current.pagedEntries).toEqual(entries)
    expect(result.current.canGoPrev).toBe(false)
    expect(result.current.canGoNext).toBe(false)
  })

  it("does not page for 'custom' -- respects the given custom range exactly", () => {
    const entries = [
      entry('2026-01-01'),
      entry('2026-01-15'),
      entry('2026-02-01'),
    ]
    const { result } = renderHook(() =>
      useChartPeriodPager('custom', '2026-01-01', '2026-01-31', entries, TODAY),
    )

    expect(result.current.showPager).toBe(false)
    expect(result.current.pagedEntries.map((e) => e.date)).toEqual([
      '2026-01-01',
      '2026-01-15',
    ])
  })

  it("shows the current week's own entries when not yet paged", () => {
    const entries = [
      entry('2026-07-01'), // outside the current week
      entry('2026-07-22'),
      entry('2026-07-28'),
    ]
    const { result } = renderHook(() =>
      useChartPeriodPager('week', '', '', entries, TODAY),
    )

    expect(result.current.showPager).toBe(true)
    expect(result.current.range).toEqual({
      start: '2026-07-22',
      end: '2026-07-28',
    })
    expect(result.current.pagedEntries.map((e) => e.date)).toEqual([
      '2026-07-22',
      '2026-07-28',
    ])
    // Already at the current window -- nothing to page forward to.
    expect(result.current.canGoNext).toBe(false)
    // An entry exists before the visible window's start.
    expect(result.current.canGoPrev).toBe(true)
  })

  it('cannot page back further once no entry exists before the visible window', () => {
    const entries = [entry('2026-07-22'), entry('2026-07-28')]
    const { result } = renderHook(() =>
      useChartPeriodPager('week', '', '', entries, TODAY),
    )

    expect(result.current.canGoPrev).toBe(false)
  })

  it('goPrev() shifts the window back by exactly one window (7 days for week)', () => {
    const entries = [entry('2026-07-01'), entry('2026-07-15'), entry('2026-07-28')]
    const { result } = renderHook(() =>
      useChartPeriodPager('week', '', '', entries, TODAY),
    )

    act(() => result.current.goPrev())

    expect(result.current.range).toEqual({
      start: '2026-07-15',
      end: '2026-07-21',
    })
    expect(result.current.pagedEntries.map((e) => e.date)).toEqual([
      '2026-07-15',
    ])
    expect(result.current.canGoNext).toBe(true)
  })

  it('goNext() from the current window stays clamped at the current window', () => {
    const entries = [entry('2026-07-28')]
    const { result } = renderHook(() =>
      useChartPeriodPager('week', '', '', entries, TODAY),
    )

    act(() => result.current.goNext())

    expect(result.current.range).toEqual({
      start: '2026-07-22',
      end: '2026-07-28',
    })
    expect(result.current.canGoNext).toBe(false)
  })

  it('goNext() steps back toward the current window one page at a time', () => {
    const entries = [entry('2026-07-15'), entry('2026-07-28')]
    const { result } = renderHook(() =>
      useChartPeriodPager('week', '', '', entries, TODAY),
    )

    act(() => result.current.goPrev())
    act(() => result.current.goPrev())
    act(() => result.current.goNext())

    // Two steps back then one forward == one step back overall.
    expect(result.current.range).toEqual({
      start: '2026-07-15',
      end: '2026-07-21',
    })
  })

  // #625 — when the caller omits `today` (the normal case), the pager
  // should default to the day-start-adjusted "today" rather than the raw
  // clock, same as every other rolling window.
  it('defaults to the day-start-adjusted "today" when no override is passed', () => {
    useDayStartStore.setState({ dayStartTime: '04:00' })
    vi.useFakeTimers()
    // Monday 2026-08-03, 01:00 — real calendar Monday, but still "Sunday
    // night" per a 04:00 day-start.
    vi.setSystemTime(new Date('2026-08-03T01:00:00'))
    const entries = [entry('2026-07-22'), entry('2026-07-27')]

    const { result } = renderHook(() =>
      useChartPeriodPager('week', '', '', entries),
    )

    // Without the day-start adjustment the current week would already be
    // Aug 3-9 once the real clock ticks past midnight.
    expect(result.current.range).toEqual({
      start: '2026-07-27',
      end: '2026-08-02',
    })

    vi.useRealTimers()
    useDayStartStore.setState({ dayStartTime: '00:00' })
  })

  it('resets the page offset back to current when the period type itself changes', () => {
    const entries = [entry('2026-06-01'), entry('2026-07-28')]
    const { result, rerender } = renderHook(
      ({ period }: { period: 'week' | 'month' }) =>
        useChartPeriodPager(period, '', '', entries, TODAY),
      { initialProps: { period: 'week' } },
    )

    act(() => result.current.goPrev())
    expect(result.current.canGoNext).toBe(true)

    rerender({ period: 'month' })

    expect(result.current.canGoNext).toBe(false)
    expect(result.current.range).toEqual({
      start: '2026-06-29',
      end: '2026-07-28',
    })
  })
})
