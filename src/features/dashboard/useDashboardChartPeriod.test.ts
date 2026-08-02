import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import {
  DASHBOARD_PERIOD_CHART_KEYS,
  useDashboardPeriodStore,
} from '@/stores'
import {
  useDashboardChartPeriod,
  usePeriodFilteredEntries,
} from './useDashboardChartPeriod'

function makeEntry(date: string): DailyEntry {
  const now = new Date().toISOString()
  return {
    id: date,
    date,
    weightKg: 80,
    calorieEntries: [],
    createdAt: now,
    updatedAt: now,
  }
}

beforeEach(() => {
  useDashboardPeriodStore.setState({
    byChart: Object.fromEntries(
      DASHBOARD_PERIOD_CHART_KEYS.map((key) => [
        key,
        { period: 'all', customStart: '', customEnd: '' },
      ]),
    ) as ReturnType<typeof useDashboardPeriodStore.getState>['byChart'],
  })
})

describe('useDashboardChartPeriod (#537)', () => {
  it('does not re-render when a different chart’s period changes', () => {
    let renders = 0
    const { result } = renderHook(() => {
      renders += 1
      return useDashboardChartPeriod('weight')
    })
    const first = result.current
    const rendersAfterMount = renders

    act(() => {
      useDashboardPeriodStore.getState().setPeriod('calories', 'week')
    })

    expect(renders).toBe(rendersAfterMount)
    expect(result.current).toBe(first)
  })

  it('re-renders when its own chart’s period changes', () => {
    let renders = 0
    const { result } = renderHook(() => {
      renders += 1
      return useDashboardChartPeriod('weight')
    })
    const rendersAfterMount = renders

    act(() => {
      useDashboardPeriodStore.getState().setPeriod('weight', 'month')
    })

    expect(renders).toBeGreaterThan(rendersAfterMount)
    expect(result.current.period).toBe('month')
  })
})

describe('usePeriodFilteredEntries', () => {
  it('filters by the chart’s stored period', () => {
    const entries = [
      makeEntry('2020-01-01'),
      makeEntry('2026-08-01'),
      makeEntry('2026-08-02'),
    ]
    const store = useDashboardPeriodStore.getState()
    store.setPeriod('sleepCorrelation', 'custom')
    store.setCustomStart('sleepCorrelation', '2026-08-01')
    store.setCustomEnd('sleepCorrelation', '2026-08-02')

    const { result } = renderHook(() =>
      usePeriodFilteredEntries('sleepCorrelation', entries),
    )

    expect(result.current.map((e) => e.date)).toEqual([
      '2026-08-01',
      '2026-08-02',
    ])
  })
})
