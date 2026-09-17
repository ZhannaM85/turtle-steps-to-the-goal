import { describe, expect, it } from 'vitest'
import { calculateBmr } from './bodyComposition'
import { calculateTdee } from './targetCalculator'
import { KCAL_PER_KG_FAT } from '@/domain/goal'
import { formatLocalizedDate } from '@/i18n'
import {
  COMPLETE_DAY_GRID_KG,
  COMPLETE_DAY_HORIZON_DAYS,
  COMPLETE_DAY_HORIZON_WEEKS,
  COMPLETE_DAY_OSCILLATION_KG,
  COMPLETE_DAY_TREND_WINDOW_DAYS,
  completeDayChartEndAxisLabel,
  completeDayOscillatingDailyKg,
  completeDayOscillationSeed,
  completeDayProjectionBlocker,
  completeDayProjectionChartPoints,
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

describe('complete-the-day oscillating dual series (#947)', () => {
  const logged = { ...sample, logDate: '2026-03-01' }

  it('builds a jagged daily path around the trend, not a straight primary', () => {
    const result = projectWeightIfEatingLikeToday(logged)
    expect(COMPLETE_DAY_TREND_WINDOW_DAYS).toBe(7)
    expect(COMPLETE_DAY_OSCILLATION_KG).toBe(0.4)
    expect(result.chartPoints).toHaveLength(COMPLETE_DAY_HORIZON_DAYS + 1)
    expect(result.chartPoints[0]?.weightKg).toBe(60.2)
    expect(result.chartPoints.at(-1)?.weightKg).toBeCloseTo(
      result.projectedWeightKg,
    )
    expect(result.chartPoints.at(-1)?.week).toBe(COMPLETE_DAY_HORIZON_WEEKS)

    const weights = result.chartPoints.map((point) => point.weightKg)
    let signFlips = 0
    let previousDelta = 0
    for (let i = 1; i < weights.length; i += 1) {
      const delta = weights[i]! - weights[i - 1]!
      if (
        previousDelta !== 0 &&
        delta !== 0 &&
        Math.sign(delta) !== Math.sign(previousDelta)
      ) {
        signFlips += 1
      }
      if (delta !== 0) previousDelta = delta
    }
    expect(signFlips).toBeGreaterThan(3)

    const start = weights[0]!
    const end = weights[weights.length - 1]!
    const last = weights.length - 1
    let maxDeviation = 0
    for (let i = 1; i < last; i += 1) {
      const linear = start + ((end - start) * i) / last
      maxDeviation = Math.max(maxDeviation, Math.abs(weights[i]! - linear))
    }
    expect(maxDeviation).toBeGreaterThan(0.15)
  })

  it('uses the trailing 7-day average of that oscillating series', () => {
    const result = projectWeightIfEatingLikeToday(logged)
    const rebuilt = completeDayProjectionChartPoints(
      result.chartPoints.map((point) => point.weightKg),
    )
    expect(result.chartPoints.map((point) => point.averageKg)).toEqual(
      rebuilt.map((point) => point.averageKg),
    )
    const later = result.chartPoints[14]!
    const window = result.chartPoints
      .slice(14 - 6, 15)
      .map((point) => point.weightKg)
    expect(later.averageKg).toBeCloseTo(
      window.reduce((sum, kg) => sum + kg, 0) / 7,
    )
  })

  it('is deterministic for the same log day and inputs', () => {
    const first = projectWeightIfEatingLikeToday(logged)
    const second = projectWeightIfEatingLikeToday(logged)
    expect(first.chartPoints).toEqual(second.chartPoints)
    const otherDay = projectWeightIfEatingLikeToday({
      ...logged,
      logDate: '2026-03-02',
    })
    expect(otherDay.chartPoints[10]?.weightKg).not.toBe(
      first.chartPoints[10]?.weightKg,
    )
  })

  it('pins start and end of a synthetic series to the trend', () => {
    const trend = [60, 59.8, 59.6, 59.4, 59.2, 59, 58.8]
    const seed = completeDayOscillationSeed(logged)
    const a = completeDayOscillatingDailyKg(trend, seed)
    const b = completeDayOscillatingDailyKg(trend, seed)
    expect(a).toEqual(b)
    expect(a[0]).toBe(60)
    expect(a.at(-1)).toBe(58.8)
    expect(a[3]).not.toBe(trend[3])
  })

  it('lags the companion behind a rising oscillating path too', () => {
    const rising = completeDayProjectionChartPoints([
      60, 61, 62, 63, 64, 65, 66, 67,
    ])
    expect(rising[7]?.weightKg).toBe(67)
    expect(rising[7]?.averageKg).toBeCloseTo(
      (61 + 62 + 63 + 64 + 65 + 66 + 67) / 7,
    )
    expect(rising[7]!.averageKg).toBeLessThan(rising[7]!.weightKg)
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

describe('complete-the-day chart end date (#945 / #947)', () => {
  it('names week 5 as a calendar date only, without the duration prefix', () => {
    const endIso = completeDayProjectionEndIso('2026-03-01')
    expect(endIso).toBe('2026-04-05')
    expect(
      completeDayChartEndAxisLabel(formatLocalizedDate(endIso, 'en')),
    ).toBe('Apr 5, 2026')
    expect(
      completeDayChartEndAxisLabel(formatLocalizedDate(endIso, 'ru')),
    ).toBe('5 апр. 2026 г.')
    expect(
      completeDayChartEndAxisLabel(formatLocalizedDate(endIso, 'en')),
    ).not.toMatch(/5 weeks/)
    expect(
      completeDayChartEndAxisLabel(formatLocalizedDate(endIso, 'ru')),
    ).not.toMatch(/5 недель/)
  })
})

describe('complete-the-day chart grid (#936)', () => {
  it('places a vertical line at each of the six week marks', () => {
    expect(completeDayWeekGridTicks()).toEqual([0, 1, 2, 3, 4, 5])
    expect(completeDayWeekGridTicks()).toHaveLength(
      COMPLETE_DAY_HORIZON_WEEKS + 1,
    )
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
