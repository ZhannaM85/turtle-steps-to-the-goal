import { describe, expect, it } from 'vitest'
import {
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
