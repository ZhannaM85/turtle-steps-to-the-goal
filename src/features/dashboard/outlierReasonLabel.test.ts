import { describe, expect, it } from 'vitest'
import type { Dictionary } from '@/i18n/Dictionary'
import { outlierReasonLabel } from './outlierReasonLabel'

const dashboard = {
  outlierReasonWeightChange: 'unusual weight change',
  outlierReasonWeightChangeShort: 'weight change',
  outlierReasonMetric: (metricLabel: string) => `unusual ${metricLabel}`,
  outlierReasonBoth: (metricLabel: string, otherAxisLabel: string) =>
    `unusual ${metricLabel} and ${otherAxisLabel}`,
} as Dictionary['dashboard']

describe('outlierReasonLabel (#524)', () => {
  it('describes a weight-change-only outlier', () => {
    expect(
      outlierReasonLabel(dashboard, { onX: false, onY: true }, 'steps'),
    ).toBe('unusual weight change')
  })

  it('describes a metric-only outlier', () => {
    expect(
      outlierReasonLabel(dashboard, { onX: true, onY: false }, 'sleep hours'),
    ).toBe('unusual sleep hours')
  })

  it('describes both axes', () => {
    expect(
      outlierReasonLabel(dashboard, { onX: true, onY: true }, 'steps'),
    ).toBe('unusual steps and weight change')
  })

  it('uses a custom other-axis label when provided', () => {
    expect(
      outlierReasonLabel(
        dashboard,
        { onX: true, onY: true },
        'training',
        'acne',
      ),
    ).toBe('unusual training and acne')
  })
})
