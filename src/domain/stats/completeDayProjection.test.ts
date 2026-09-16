import { describe, expect, it } from 'vitest'
import { calculateBmr } from './bodyComposition'
import { calculateTdee } from './targetCalculator'
import { KCAL_PER_KG_FAT } from '@/domain/goal'
import {
  COMPLETE_DAY_HORIZON_DAYS,
  COMPLETE_DAY_HORIZON_WEEKS,
  completeDayProjectionBlocker,
  projectWeightIfEatingLikeToday,
} from './completeDayProjection'

const sample = {
  weightKg: 60.2,
  dailyKcal: 1200,
  heightCm: 165,
  age: 41,
  sex: 'female' as const,
  activityLevel: 'sedentary' as const,
}

describe('projectWeightIfEatingLikeToday (#934)', () => {
  it('uses Mifflin–St Jeor (+5 male / −161 female) for starting TDEE', () => {
    const female = projectWeightIfEatingLikeToday(sample)
    expect(calculateBmr(60.2, 165, 41, 'female')).toBeCloseTo(1267.25)
    expect(female.tdeeKcal).toBe(Math.round(1267.25 * 1.2))
    expect(female.dailyDeficitKcal).toBe(female.tdeeKcal - 1200)

    const maleBmr = calculateBmr(80, 180, 40, 'male')
    expect(maleBmr).toBe(1730)
    expect(calculateTdee(maleBmr, 'sedentary')).toBeCloseTo(2076)
  })

  it('lands a little less far than a straight 35-day ruler because TDEE falls', () => {
    const result = projectWeightIfEatingLikeToday(sample)
    const staticKg =
      ((result.tdeeKcal - sample.dailyKcal) * COMPLETE_DAY_HORIZON_DAYS) /
      KCAL_PER_KG_FAT
    expect(result.points).toHaveLength(COMPLETE_DAY_HORIZON_WEEKS + 1)
    expect(result.points[0]?.weightKg).toBe(60.2)
    expect(result.projectedWeightKg).toBeLessThan(60.2)
    expect(result.totalChangeKg).toBeGreaterThan(0)
    expect(result.totalChangeKg).toBeLessThan(staticKg)
  })

  it('projects a gain when intake is above TDEE but still inside the band', () => {
    const result = projectWeightIfEatingLikeToday({
      ...sample,
      dailyKcal: 1800,
    })
    expect(result.projectedWeightKg).toBeGreaterThan(60.2)
    expect(result.totalChangeKg).toBeLessThan(0)
  })
})

describe('completeDayProjectionBlocker (#934)', () => {
  it('requires a positive weight', () => {
    expect(
      completeDayProjectionBlocker({
        ...sample,
        weightKg: undefined,
      }),
    ).toBe('missingWeight')
  })

  it('requires a logged calorie total', () => {
    expect(
      completeDayProjectionBlocker({
        ...sample,
        dailyKcal: undefined,
      }),
    ).toBe('missingCalories')
  })

  it('requires a complete TDEE profile', () => {
    expect(
      completeDayProjectionBlocker({
        ...sample,
        activityLevel: undefined,
      }),
    ).toBe('missingProfile')
  })

  it('skips a 600 kcal day as too low to project from', () => {
    expect(
      completeDayProjectionBlocker({
        ...sample,
        dailyKcal: 600,
      }),
    ).toBe('unusualLow')
  })

  it('skips a feast day as too high to project from', () => {
    expect(
      completeDayProjectionBlocker({
        ...sample,
        dailyKcal: 3000,
      }),
    ).toBe('unusualHigh')
  })

  it('allows a moderate deficit like 1200 kcal', () => {
    expect(completeDayProjectionBlocker(sample)).toBeUndefined()
  })
})
