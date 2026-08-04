import { describe, expect, it } from 'vitest'
import {
  CORRELATION_SCATTER_Y_AXIS_WIDTH,
  formatCorrelationScatterTick,
} from './correlationScatterAxis'

describe('correlationScatterAxis (#596)', () => {
  it('formats ticks to exactly one fraction digit', () => {
    expect(formatCorrelationScatterTick(36.51428571428571, 'en')).toBe('36.5')
    expect(formatCorrelationScatterTick(-0.27515, 'en')).toBe('-0.3')
    expect(formatCorrelationScatterTick(36.51428571428571, 'ru')).toBe('36,5')
    expect(formatCorrelationScatterTick(-0.27515, 'ru')).toBe('-0,3')
  })

  it('keeps a Y gutter wide enough for signed one-decimal labels', () => {
    expect(CORRELATION_SCATTER_Y_AXIS_WIDTH).toBeGreaterThanOrEqual(48)
  })
})
