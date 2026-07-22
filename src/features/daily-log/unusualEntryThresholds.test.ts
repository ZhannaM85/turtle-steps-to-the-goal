import { describe, expect, it } from 'vitest'
import {
  isInconsistentMacros,
  isUnusualDailyCalories,
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
