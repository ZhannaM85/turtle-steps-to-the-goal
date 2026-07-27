import { describe, expect, it } from 'vitest'
import {
  classifyCorrelationStrength,
  classifyRelativeCorrelationStrength,
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

describe('classifyRelativeCorrelationStrength', () => {
  // [0, 0, 10, 10] -> mean 5, variance 25, stdDev 5 — a round number makes
  // the effect-size (difference / stdDev) bands easy to hit exactly.
  const values = [0, 0, 10, 10]

  it('classifies an effect size below 0.5 as weak', () => {
    expect(classifyRelativeCorrelationStrength(1, values)).toBe('weak') // 0.2
    expect(classifyRelativeCorrelationStrength(0, values)).toBe('weak')
  })

  it('classifies an effect size at or above 0.5 (but below 0.8) as moderate', () => {
    expect(classifyRelativeCorrelationStrength(2.5, values)).toBe('moderate') // 0.5
  })

  it('classifies an effect size at or above 0.8 as strong', () => {
    expect(classifyRelativeCorrelationStrength(4, values)).toBe('strong') // 0.8
    expect(classifyRelativeCorrelationStrength(10, values)).toBe('strong')
  })

  it('takes the absolute value, so a negative difference classifies the same as its positive counterpart', () => {
    expect(classifyRelativeCorrelationStrength(-4, values)).toBe('strong')
  })

  it('is scale-invariant — a large effect size classifies as strong on a completely different scale', () => {
    // [1, 1, 5, 5] -> mean 3, variance 8, stdDev ~2.83 — a 1-5 severity
    // scale instead of the kg-sized numbers the other cases use. A
    // difference of 3 is a ~1.06 effect size here, comfortably "strong",
    // the same way the kg-scale case above needed a difference of 4
    // against its own stdDev of 5.
    expect(classifyRelativeCorrelationStrength(3, [1, 1, 5, 5])).toBe('strong')
  })

  it('returns weak when every value is identical (zero variance)', () => {
    expect(classifyRelativeCorrelationStrength(5, [3, 3, 3, 3])).toBe('weak')
  })

  it('returns weak with fewer than two values', () => {
    expect(classifyRelativeCorrelationStrength(5, [3])).toBe('weak')
    expect(classifyRelativeCorrelationStrength(5, [])).toBe('weak')
  })
})
