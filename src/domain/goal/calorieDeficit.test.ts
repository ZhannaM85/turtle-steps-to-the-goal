import { describe, expect, it } from 'vitest'
import {
  estimatedDailyCalorieDeficitKcal,
  estimatedWeeklyLossKgFromDailyDeficitKcal,
} from './calorieDeficit'

describe('estimatedDailyCalorieDeficitKcal', () => {
  it('estimates ~1100 kcal/day for a 1kg/week pace', () => {
    expect(estimatedDailyCalorieDeficitKcal(1)).toBe(1100)
  })

  it('scales linearly with pace', () => {
    expect(estimatedDailyCalorieDeficitKcal(0.5)).toBe(550)
    expect(estimatedDailyCalorieDeficitKcal(2)).toBe(2200)
  })

  it('returns 0 for a 0kg/week pace (no variance)', () => {
    expect(estimatedDailyCalorieDeficitKcal(0)).toBe(0)
  })

  it('returns a negative value for a weight-gain pace', () => {
    expect(estimatedDailyCalorieDeficitKcal(-1)).toBe(-1100)
  })
})

describe('estimatedWeeklyLossKgFromDailyDeficitKcal (#558)', () => {
  it('inverts the daily-deficit estimate', () => {
    expect(estimatedWeeklyLossKgFromDailyDeficitKcal(1100)).toBe(1)
    expect(estimatedWeeklyLossKgFromDailyDeficitKcal(550)).toBe(0.5)
  })

  it('returns a negative pace for a surplus (negative deficit)', () => {
    expect(estimatedWeeklyLossKgFromDailyDeficitKcal(-1100)).toBe(-1)
  })
})
