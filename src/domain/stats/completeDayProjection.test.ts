import { describe, expect, it } from 'vitest'
import { calculateBmr } from './bodyComposition'
import { calculateTdee } from './targetCalculator'
import { KCAL_PER_KG_FAT } from '@/domain/goal'
import { formatLocalizedDate } from '@/i18n'
import {
  COMPLETE_DAY_DEFAULT_HORIZON,
  COMPLETE_DAY_GRID_KG,
  COMPLETE_DAY_HORIZON_DAYS,
  COMPLETE_DAY_OSCILLATION_KG,
  COMPLETE_DAY_TREND_WINDOW_DAYS,
  COMPLETE_DAY_AXIS_DAY_STEP,
  COMPLETE_DAY_AXIS_MAX_TICKS,
  completeDayAxisDayTicks,
  completeDayAxisTickLabel,
  completeDayChartEndAxisLabel,
  completeDayHorizonDays,
  completeDayHorizonWeeks,
  completeDayOscillatingDailyKg,
  completeDayOscillationSeed,
  completeDayProjectionBlocker,
  completeDayProjectionChartPoints,
  completeDayProjectionEndIso,
  completeDayWeekGridTicks,
  completeDayWeightAxisTicks,
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

  it('lands a little less far than a straight 7-day ruler because TDEE falls', () => {
    const result = projectWeightIfEatingLikeToday(sample)
    const staticKg =
      ((result.tdeeKcal - sample.dailyKcal) * COMPLETE_DAY_HORIZON_DAYS.week) /
      KCAL_PER_KG_FAT
    expect(result.points).toHaveLength(2)
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
    const result = projectWeightIfEatingLikeToday({
      ...logged,
      horizon: 'month',
    })
    expect(COMPLETE_DAY_TREND_WINDOW_DAYS).toBe(7)
    expect(COMPLETE_DAY_OSCILLATION_KG).toBe(0.4)
    expect(result.chartPoints).toHaveLength(COMPLETE_DAY_HORIZON_DAYS.month + 1)
    expect(result.chartPoints[0]?.weightKg).toBe(60.2)
    expect(result.chartPoints.at(-1)?.weightKg).toBeCloseTo(
      result.projectedWeightKg,
    )
    expect(result.chartPoints.at(-1)?.week).toBeCloseTo(
      completeDayHorizonWeeks('month'),
    )

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

  it('still oscillates on the default week horizon', () => {
    const result = projectWeightIfEatingLikeToday(logged)
    expect(result.chartPoints).toHaveLength(COMPLETE_DAY_HORIZON_DAYS.week + 1)
    expect(result.chartPoints[0]?.weightKg).toBe(60.2)
    expect(result.chartPoints.at(-1)?.weightKg).toBeCloseTo(
      result.projectedWeightKg,
    )
    expect(result.chartPoints[3]?.weightKg).not.toBeCloseTo(
      60.2 +
        ((result.projectedWeightKg - 60.2) * 3) /
          COMPLETE_DAY_HORIZON_DAYS.week,
      3,
    )
  })

  it('uses the 7-day average of that oscillating series', () => {
    const result = projectWeightIfEatingLikeToday({
      ...logged,
      horizon: 'month',
    })
    const rebuilt = completeDayProjectionChartPoints(
      result.chartPoints.map((point) => point.weightKg),
    )
    expect(result.chartPoints.map((point) => point.averageKg)).toEqual(
      rebuilt.map((point) => point.averageKg),
    )
    const later = result.chartPoints[14]!
    const window = result.chartPoints
      .slice(14 - 3, 14 + 4)
      .map((point) => point.weightKg)
    expect(window).toHaveLength(7)
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
    expect(otherDay.chartPoints[3]?.weightKg).not.toBe(
      first.chartPoints[3]?.weightKg,
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

  it('cuts the 7-day average through the middle of a linear series (#950)', () => {
    const rising = completeDayProjectionChartPoints([
      60, 61, 62, 63, 64, 65, 66, 67,
    ])
    expect(rising[4]?.weightKg).toBe(64)
    expect(rising[4]?.averageKg).toBeCloseTo(64)
    expect(rising[3]?.averageKg).toBeCloseTo(rising[3]!.weightKg)
  })

  it('keeps zero-mean residuals vs the trend and 7-day average (#950)', () => {
    const trend = Array.from({ length: 31 }, (_, day) => 60 - day * 0.05)
    const daily = completeDayOscillatingDailyKg(
      trend,
      completeDayOscillationSeed(logged),
    )
    expect(daily[0]).toBe(60)
    expect(daily.at(-1)).toBe(trend.at(-1))

    const interior = daily.slice(1, -1)
    const trendInterior = trend.slice(1, -1)
    const vsTrend = interior.map((kg, i) => kg - trendInterior[i]!)
    const meanVsTrend =
      vsTrend.reduce((sum, kg) => sum + kg, 0) / vsTrend.length
    expect(Math.abs(meanVsTrend)).toBeLessThan(1e-9)
    expect(vsTrend.filter((kg) => kg > 1e-9).length).toBeGreaterThan(5)
    expect(vsTrend.filter((kg) => kg < -1e-9).length).toBeGreaterThan(5)

    const chart = completeDayProjectionChartPoints(daily)
    const vsAverage = chart.map((point) => point.weightKg - point.averageKg)
    const meanVsAverage =
      vsAverage.reduce((sum, kg) => sum + kg, 0) / vsAverage.length
    expect(Math.abs(meanVsAverage)).toBeLessThan(0.03)
    expect(vsAverage.filter((kg) => kg > 1e-9).length).toBeGreaterThan(5)
    expect(vsAverage.filter((kg) => kg < -1e-9).length).toBeGreaterThan(5)
  })

  it('stays balanced around the average on Week, Month, and Year (#950)', () => {
    for (const horizon of ['week', 'month', 'year'] as const) {
      const result = projectWeightIfEatingLikeToday({
        ...logged,
        horizon,
      })
      const vsAverage = result.chartPoints.map(
        (point) => point.weightKg - point.averageKg,
      )
      const mean = vsAverage.reduce((sum, kg) => sum + kg, 0) / vsAverage.length
      const above = vsAverage.filter((kg) => kg > 1e-9).length
      const below = vsAverage.filter((kg) => kg < -1e-9).length
      expect(Math.abs(mean)).toBeLessThan(0.05)
      expect(above).toBeGreaterThan(0)
      expect(below).toBeGreaterThan(0)
      expect(result.chartPoints[0]?.weightKg).toBe(60.2)
      expect(result.chartPoints.at(-1)?.weightKg).toBeCloseTo(
        result.projectedWeightKg,
      )
    }
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

describe('complete-the-day chart end date (#945 / #947 / #948)', () => {
  it('names the horizon end as a calendar date only, without the duration prefix', () => {
    const endIso = completeDayProjectionEndIso('2026-03-01')
    expect(endIso).toBe('2026-03-08')
    expect(
      completeDayChartEndAxisLabel(formatLocalizedDate(endIso, 'en')),
    ).toBe('Mar 8, 2026')
    expect(
      completeDayChartEndAxisLabel(formatLocalizedDate(endIso, 'ru')),
    ).toBe('8 мар. 2026 г.')
    expect(
      completeDayChartEndAxisLabel(formatLocalizedDate(endIso, 'en')),
    ).not.toMatch(/1 week/)
    expect(
      completeDayChartEndAxisLabel(formatLocalizedDate(endIso, 'ru')),
    ).not.toMatch(/1 неделю/)
  })
})

describe('complete-the-day chart grid (#936 / #948)', () => {
  it('places vertical lines at today and the week end by default', () => {
    expect(completeDayWeekGridTicks()).toEqual([0, 1])
    expect(completeDayWeekGridTicks('week')).toEqual([0, 1])
  })

  it('places a weekly mesh plus the 30-day end for Month', () => {
    expect(completeDayWeekGridTicks('month')).toEqual([0, 1, 2, 3, 4, 30 / 7])
  })

  it('keeps Year ticks sparse instead of one per week', () => {
    const ticks = completeDayWeekGridTicks('year')
    expect(ticks[0]).toBe(0)
    expect(ticks.at(-1)).toBe(365 / 7)
    expect(ticks.length).toBeLessThanOrEqual(7)
    expect(ticks.length).toBeGreaterThan(2)
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

describe('complete-the-day horizons (#948)', () => {
  it('defaults to Week = 7 days, with Month = 30 and Year = 365', () => {
    expect(COMPLETE_DAY_DEFAULT_HORIZON).toBe('week')
    expect(COMPLETE_DAY_HORIZON_DAYS).toEqual({
      week: 7,
      month: 30,
      year: 365,
    })
    expect(completeDayHorizonDays()).toBe(7)
    expect(completeDayHorizonDays('week')).toBe(7)
    expect(completeDayHorizonDays('month')).toBe(30)
    expect(completeDayHorizonDays('year')).toBe(365)
    expect(completeDayHorizonWeeks('week')).toBe(1)
    expect(completeDayHorizonWeeks('month')).toBeCloseTo(30 / 7)
    expect(completeDayHorizonWeeks('year')).toBeCloseTo(365 / 7)
  })

  it('shifts the chart end date with the selected horizon', () => {
    expect(completeDayProjectionEndIso('2026-03-01', 'week')).toBe('2026-03-08')
    expect(completeDayProjectionEndIso('2026-03-01', 'month')).toBe(
      '2026-03-31',
    )
    expect(completeDayProjectionEndIso('2026-03-01', 'year')).toBe('2027-03-01')
  })

  it('recalculates the estimate path length for each horizon', () => {
    const week = projectWeightIfEatingLikeToday(sample)
    const month = projectWeightIfEatingLikeToday({
      ...sample,
      horizon: 'month',
    })
    const year = projectWeightIfEatingLikeToday({
      ...sample,
      horizon: 'year',
    })
    expect(week.chartPoints).toHaveLength(8)
    expect(month.chartPoints).toHaveLength(31)
    expect(year.chartPoints).toHaveLength(366)
    expect(month.totalChangeKg).toBeGreaterThan(week.totalChangeKg)
    expect(year.totalChangeKg).toBeGreaterThan(month.totalChangeKg)
    expect(week.chartPoints.at(-1)?.week).toBe(1)
    expect(month.chartPoints.at(-1)?.week).toBeCloseTo(30 / 7)
    expect(year.chartPoints.at(-1)?.week).toBeCloseTo(365 / 7)
  })
})

describe('complete-the-day axis ticks (#949)', () => {
  it('uses a daily X tick on Week', () => {
    expect(COMPLETE_DAY_AXIS_DAY_STEP.week).toBe(1)
    expect(completeDayAxisDayTicks('week')).toEqual([
      0,
      1 / 7,
      2 / 7,
      3 / 7,
      4 / 7,
      5 / 7,
      6 / 7,
      1,
    ])
  })

  it('uses every 5 days on Month', () => {
    expect(COMPLETE_DAY_AXIS_DAY_STEP.month).toBe(5)
    expect(completeDayAxisDayTicks('month')).toEqual([
      0,
      5 / 7,
      10 / 7,
      15 / 7,
      20 / 7,
      25 / 7,
      30 / 7,
    ])
  })

  it('keeps Year X ticks sparse instead of one per day', () => {
    expect(COMPLETE_DAY_AXIS_DAY_STEP.year).toBe(60)
    const ticks = completeDayAxisDayTicks('year')
    expect(ticks[0]).toBe(0)
    expect(ticks.at(-1)).toBe(365 / 7)
    expect(ticks.length).toBeLessThanOrEqual(8)
    expect(ticks.length).toBeGreaterThan(4)
    expect(ticks.length).toBeLessThan(COMPLETE_DAY_HORIZON_DAYS.year)
    const days = ticks.map((week) => week * 7)
    for (let i = 1; i < days.length - 1; i += 1) {
      expect(days[i]! - days[i - 1]!).toBeGreaterThanOrEqual(60)
    }
  })

  it('labels Today, the date-only end, and interior day numbers', () => {
    expect(completeDayAxisTickLabel(0, 1, 'Today', 'Mar 8, 2026')).toBe('Today')
    expect(completeDayAxisTickLabel(1, 1, 'Today', 'Mar 8, 2026')).toBe(
      'Mar 8, 2026',
    )
    expect(completeDayAxisTickLabel(3 / 7, 1, 'Today', 'Mar 8, 2026')).toBe('3')
    expect(
      completeDayAxisTickLabel(60 / 7, 365 / 7, 'Today', 'Mar 1, 2027'),
    ).toBe('60')
  })

  it('keeps dense 500 g Y ticks on a short Week range', () => {
    const ticks = completeDayWeightAxisTicks(59.8, 60.3)
    expect(COMPLETE_DAY_AXIS_MAX_TICKS).toBe(7)
    expect(ticks).toEqual([59.5, 60, 60.5])
  })

  it('thins Y ticks for a wide Year-like range', () => {
    const ticks = completeDayWeightAxisTicks(45, 60.2)
    expect(ticks.length).toBeGreaterThan(1)
    expect(ticks.length).toBeLessThanOrEqual(COMPLETE_DAY_AXIS_MAX_TICKS)
    expect(ticks.length).toBeLessThan(
      completeDayWeightGridTicksKg(45, 60.2).length,
    )
    expect(ticks[0]).toBeLessThanOrEqual(45)
    expect(ticks.at(-1)).toBeGreaterThanOrEqual(60.2)
  })
})
