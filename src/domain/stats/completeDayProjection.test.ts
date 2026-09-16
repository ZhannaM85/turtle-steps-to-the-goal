import { describe, expect, it } from 'vitest'
import { calculateBmr } from './bodyComposition'
import { calculateTdee } from './targetCalculator'
import { KCAL_PER_KG_FAT } from '@/domain/goal'
import { formatLocalizedDate } from '@/i18n'
import {
  COMPLETE_DAY_GRID_KG,
  COMPLETE_DAY_HORIZON_DAYS,
  COMPLETE_DAY_HORIZON_WEEKS,
  completeDayChartEndAxisLabel,
  completeDayProjectionBlocker,
  completeDayProjectionEndIso,
  completeDayWeekGridTicks,
  completeDayWeightGridTicksKg,
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

describe('complete-the-day chart end date (#945)', () => {
  it('names week 5 as a real calendar date, paired with the 5-week span', () => {
    const endIso = completeDayProjectionEndIso('2026-03-01')
    expect(endIso).toBe('2026-04-05')
    expect(
      completeDayChartEndAxisLabel(
        '5 weeks',
        formatLocalizedDate(endIso, 'en'),
      ),
    ).toBe('5 weeks · Apr 5, 2026')
    expect(
      completeDayChartEndAxisLabel(
        '5 недель',
        formatLocalizedDate(endIso, 'ru'),
      ),
    ).toBe('5 недель · 5 апр. 2026 г.')
  })
})

describe('complete-the-day chart grid (#936)', () => {
  it('places a vertical line at each of the six week marks', () => {
    expect(completeDayWeekGridTicks()).toEqual([0, 1, 2, 3, 4, 5])
    expect(completeDayWeekGridTicks()).toHaveLength(COMPLETE_DAY_HORIZON_WEEKS + 1)
  })

  it('places a horizontal line every 500 g covering the projected range', () => {
    expect(COMPLETE_DAY_GRID_KG).toBe(0.5)
    expect(completeDayWeightGridTicksKg(60.2, 58.8)).toEqual([
      58.5, 59, 59.5, 60, 60.5,
    ])
    expect(completeDayWeightGridTicksKg(60.2, 58.2)).toEqual([
      58, 58.5, 59, 59.5, 60, 60.5,
    ])
  })
})
