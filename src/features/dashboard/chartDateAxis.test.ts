import { formatLocalizedDate, CHART_DATE_TICK_MIN_GAP_PX } from '@/i18n'
import { describe, expect, it } from 'vitest'
import { chartDateXAxisProps } from './chartDateAxis'

describe('chartDateXAxisProps (#957)', () => {
  it('formats ticks through formatLocalizedDate and skips enough to avoid overlap', () => {
    const props = chartDateXAxisProps('en')
    expect(props.tickFormatter('2026-09-12')).toBe(
      formatLocalizedDate('2026-09-12', 'en'),
    )
    expect(props.tickFormatter('2026-09-12')).toBe('Sep 12, 2026')
    expect(props.tickFormatter('2026-09-16')).not.toMatch(/^\d{2}\/\d{2}\/\d{4}$/)
    expect(chartDateXAxisProps('ru').tickFormatter('2026-09-12')).toBe(
      '12 сент. 2026 г.',
    )
    expect(props.interval).toBe('preserveStartEnd')
    expect(props.minTickGap).toBe(CHART_DATE_TICK_MIN_GAP_PX)
    expect(props.minTickGap).toBeGreaterThanOrEqual(80)
  })
})
