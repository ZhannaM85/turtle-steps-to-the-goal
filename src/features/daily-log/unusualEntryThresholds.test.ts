import { describe, expect, it } from 'vitest'
import {
  isInconsistentMacros,
  isUnusualBodyFatPercentDelta,
  isUnusualBodyWaterPercentDelta,
  isUnusualBoneMassDeltaKg,
  isUnusualDailyCalories,
  isUnusualMuscleMassDeltaKg,
  isUnusualVisceralFatDelta,
  isUnusualWeightDeltaKg,
  isUnusualWeightKg,
  UNUSUAL_DAILY_CALORIES_KCAL,
  UNUSUAL_WEIGHT_MAX_KG,
  UNUSUAL_WEIGHT_MIN_KG,
} from './unusualEntryThresholds'

describe('isUnusualWeightKg', () => {
  it('reads a typical adult bodyweight as not unusual', () => {
    expect(isUnusualWeightKg(70)).toBe(false)
    expect(isUnusualWeightKg(59)).toBe(false)
  })

  it('flags a value below the minimum band', () => {
    expect(isUnusualWeightKg(UNUSUAL_WEIGHT_MIN_KG - 1)).toBe(true)
  })

  it('flags a value above the maximum band', () => {
    expect(isUnusualWeightKg(UNUSUAL_WEIGHT_MAX_KG + 1)).toBe(true)
  })

  it('does not flag the exact boundary values', () => {
    expect(isUnusualWeightKg(UNUSUAL_WEIGHT_MIN_KG)).toBe(false)
    expect(isUnusualWeightKg(UNUSUAL_WEIGHT_MAX_KG)).toBe(false)
  })
})

describe('isUnusualDailyCalories', () => {
  it('reads a typical day total as not unusual', () => {
    expect(isUnusualDailyCalories(2200)).toBe(false)
  })

  it('flags a total over the threshold', () => {
    expect(isUnusualDailyCalories(UNUSUAL_DAILY_CALORIES_KCAL + 1)).toBe(true)
  })

  it('does not flag the exact threshold', () => {
    expect(isUnusualDailyCalories(UNUSUAL_DAILY_CALORIES_KCAL)).toBe(false)
  })
})

describe('isInconsistentMacros', () => {
  it('does not flag a kcal figure matching its macros (165 = 31*4 + 3.6*9 + 0*4)', () => {
    expect(isInconsistentMacros(165, 31, 3.6, 0)).toBe(false)
  })

  it('does not flag when any macro is missing — nothing to compare against', () => {
    expect(isInconsistentMacros(165, 31, undefined, undefined)).toBe(false)
    expect(isInconsistentMacros(165, undefined, 3.6, 0)).toBe(false)
  })

  it('flags a kcal figure far off from its macro-derived estimate', () => {
    // Derived: 10*4 + 0*9 + 0*4 = 40kcal, entered 500 — a clear typo shape.
    expect(isInconsistentMacros(500, 10, 0, 0)).toBe(true)
  })

  it('does not flag a small, plausible label-rounding difference', () => {
    // Derived: 20*4 + 5*9 + 30*4 = 245kcal, entered 250 — within tolerance.
    expect(isInconsistentMacros(250, 20, 5, 30)).toBe(false)
  })
})

describe('unusual-vs-previous-day deltas (#401)', () => {
  it('does not flag ordinary day-to-day weight noise', () => {
    expect(isUnusualWeightDeltaKg(70.2, 70)).toBe(false)
  })

  it('flags a large overnight weight swing even within the absolute plausibility band', () => {
    // 60 -> 75kg: both individually plausible, but a 15kg jump isn't.
    expect(isUnusualWeightDeltaKg(75, 60)).toBe(true)
  })

  it('does not flag ordinary muscle mass noise, but flags a large jump', () => {
    expect(isUnusualMuscleMassDeltaKg(30.2, 30)).toBe(false)
    expect(isUnusualMuscleMassDeltaKg(35, 30)).toBe(true)
  })

  it('does not flag ordinary bone mass noise, but flags a large jump', () => {
    expect(isUnusualBoneMassDeltaKg(2.32, 2.3)).toBe(false)
    expect(isUnusualBoneMassDeltaKg(3, 2.3)).toBe(true)
  })

  it('does not flag ordinary visceral fat noise, but flags a large jump', () => {
    expect(isUnusualVisceralFatDelta(5, 5)).toBe(false)
    expect(isUnusualVisceralFatDelta(10, 5)).toBe(true)
  })

  it('does not flag ordinary body fat % noise, but flags a large jump', () => {
    expect(isUnusualBodyFatPercentDelta(32.9, 32.5)).toBe(false)
    expect(isUnusualBodyFatPercentDelta(45, 32.5)).toBe(true)
  })

  it('does not flag ordinary body water % noise, but flags a large jump', () => {
    expect(isUnusualBodyWaterPercentDelta(48.3, 48)).toBe(false)
    expect(isUnusualBodyWaterPercentDelta(60, 48)).toBe(true)
  })
})
