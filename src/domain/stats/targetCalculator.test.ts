import { describe, expect, it } from 'vitest'
import { calculateTdee, suggestDailyTargets } from './targetCalculator'

describe('calculateTdee', () => {
  it('scales BMR by the sedentary multiplier', () => {
    expect(calculateTdee(1500, 'sedentary')).toBeCloseTo(1800, 5)
  })

  it('scales BMR by the very-active multiplier', () => {
    expect(calculateTdee(1500, 'veryActive')).toBeCloseTo(2850, 5)
  })
})

describe('suggestDailyTargets', () => {
  it('computes a full set of targets from weight/height/age/sex/activity', () => {
    // BMR (Mifflin-St Jeor, female): 10*70 + 6.25*165 - 5*30 - 161 = 1420.25
    // TDEE (sedentary, x1.2): 1704.3
    const targets = suggestDailyTargets(70, 165, 30, 'female', 'sedentary', 0)

    expect(targets.calorieTargetKcal).toBe(1704)
    expect(targets.proteinTargetG).toBe(112) // round(70 * 1.6)
    expect(targets.fatTargetG).toBe(56) // round(70 * 0.8)
    // carbs = (1704 - 112*4 - 56*9) / 4 = (1704 - 448 - 504) / 4 = 188
    expect(targets.carbTargetG).toBe(188)
  })

  it('subtracts the daily deficit from TDEE to get the calorie target', () => {
    const withoutDeficit = suggestDailyTargets(
      70,
      165,
      30,
      'female',
      'sedentary',
      0,
    )
    const withDeficit = suggestDailyTargets(
      70,
      165,
      30,
      'female',
      'sedentary',
      500,
    )

    expect(withDeficit.calorieTargetKcal).toBe(
      withoutDeficit.calorieTargetKcal - 500,
    )
  })

  it('never lets the calorie target go below 0', () => {
    const targets = suggestDailyTargets(50, 150, 25, 'female', 'sedentary', 5000)
    expect(targets.calorieTargetKcal).toBe(0)
  })

  it('never lets carbs go negative when protein/fat already exceed the calorie budget', () => {
    const targets = suggestDailyTargets(50, 150, 25, 'female', 'sedentary', 5000)
    expect(targets.carbTargetG).toBe(0)
  })
})
