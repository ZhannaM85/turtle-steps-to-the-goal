import { describe, expect, it } from 'vitest'
import {
  classifyCorrelationStrength,
  DAILY_STRENGTH_THRESHOLDS_KG,
  WEEKLY_STRENGTH_THRESHOLDS_KG,
} from './correlationStrength'

describe('classifyCorrelationStrength', () => {
  it('classifies a gap below the moderate threshold as weak', () => {
    expect(
      classifyCorrelationStrength(0.02, DAILY_STRENGTH_THRESHOLDS_KG),
    ).toBe('weak')
  })

  it('classifies a gap at or above the moderate threshold as moderate', () => {
    expect(
      classifyCorrelationStrength(0.05, DAILY_STRENGTH_THRESHOLDS_KG),
    ).toBe('moderate')
    expect(
      classifyCorrelationStrength(0.1, DAILY_STRENGTH_THRESHOLDS_KG),
    ).toBe('moderate')
  })

  it('classifies a gap at or above the strong threshold as strong', () => {
    expect(
      classifyCorrelationStrength(0.15, DAILY_STRENGTH_THRESHOLDS_KG),
    ).toBe('strong')
    expect(
      classifyCorrelationStrength(0.5, DAILY_STRENGTH_THRESHOLDS_KG),
    ).toBe('strong')
  })

  it('takes the absolute value, so a negative gap classifies the same as its positive counterpart', () => {
    expect(
      classifyCorrelationStrength(-0.2, DAILY_STRENGTH_THRESHOLDS_KG),
    ).toBe('strong')
  })

  it('uses the weekly thresholds independently of the daily ones', () => {
    // 0.1kg clears the daily "moderate" bar (0.05) but not the weekly one
    // (0.15) — the two threshold sets are deliberately different scales.
    expect(classifyCorrelationStrength(0.1, WEEKLY_STRENGTH_THRESHOLDS_KG)).toBe(
      'weak',
    )
    expect(
      classifyCorrelationStrength(0.35, WEEKLY_STRENGTH_THRESHOLDS_KG),
    ).toBe('strong')
  })
})
