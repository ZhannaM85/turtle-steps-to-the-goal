import { describe, expect, it } from 'vitest'
import {
  adjustWaterMlRange,
  recommendedWaterMlRange,
  waterRecommendationMidMl,
  WATER_HOT_DAY_BUMP_ML,
  WATER_WORKOUT_BUMP_ML,
} from './waterRecommendation'

describe('recommendedWaterMlRange (#548)', () => {
  it('returns a 30–40 ml/kg band rounded to 50 ml', () => {
    // 70 kg → 2100–2800
    expect(recommendedWaterMlRange(70)).toEqual({ lowMl: 2100, highMl: 2800 })
  })

  it('returns zeros for non-positive weight', () => {
    expect(recommendedWaterMlRange(0)).toEqual({ lowMl: 0, highMl: 0 })
    expect(recommendedWaterMlRange(-1)).toEqual({ lowMl: 0, highMl: 0 })
  })
})

describe('adjustWaterMlRange (#548)', () => {
  it('adds hot-day and workout bumps to both ends', () => {
    const base = { lowMl: 2100, highMl: 2800 }
    expect(adjustWaterMlRange(base, { hotDay: true })).toEqual({
      lowMl: 2100 + WATER_HOT_DAY_BUMP_ML,
      highMl: 2800 + WATER_HOT_DAY_BUMP_ML,
    })
    expect(
      adjustWaterMlRange(base, { hotDay: true, afterWorkout: true }),
    ).toEqual({
      lowMl: 2100 + WATER_HOT_DAY_BUMP_ML + WATER_WORKOUT_BUMP_ML,
      highMl: 2800 + WATER_HOT_DAY_BUMP_ML + WATER_WORKOUT_BUMP_ML,
    })
  })
})

describe('waterRecommendationMidMl (#548)', () => {
  it('returns the rounded midpoint', () => {
    expect(waterRecommendationMidMl({ lowMl: 2100, highMl: 2800 })).toBe(2450)
  })
})
