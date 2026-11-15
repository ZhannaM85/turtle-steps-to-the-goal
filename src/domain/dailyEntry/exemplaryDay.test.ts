import { describe, expect, it } from 'vitest'
import {
  suggestExemplaryDays,
  type ExemplaryDayInput,
} from './exemplaryDay'

function day(
  date: string,
  overrides: Partial<ExemplaryDayInput> = {},
): ExemplaryDayInput {
  return { date, mealCount: 0, ...overrides }
}

function logged(
  date: string,
  calories: number,
  mealCount = 3,
  weightKg?: number,
): ExemplaryDayInput {
  return { date, calories, mealCount, weightKg }
}

describe('suggestExemplaryDays (#1125)', () => {
  it('picks a filled-in day with calories in band and next weigh-in loss ≥ 200 g', () => {
    const days = [
      logged('2026-03-02', 1800, 3, 80),
      logged('2026-03-04', 1900),
      day('2026-03-09', { weightKg: 79.5 }),
    ]

    const candidates = suggestExemplaryDays(days, {
      referenceDate: '2026-03-10',
      dailyCalorieTargetKcal: 1800,
    })

    expect(candidates[0]).toMatchObject({
      date: '2026-03-02',
      calories: 1800,
      weightChangeKg: -0.5,
    })
  })

  it('uses the next weigh-in after the day, not only the next calendar morning', () => {
    const days = [
      logged('2026-03-02', 1750, 3, 80),
      logged('2026-03-03', 1700),
      logged('2026-03-04', 1800),
      day('2026-03-08', { weightKg: 79.7 }),
    ]

    const dates = suggestExemplaryDays(days, {
      referenceDate: '2026-03-10',
      dailyCalorieTargetKcal: 1800,
    }).map((candidate) => candidate.date)

    expect(dates).toEqual(['2026-03-04', '2026-03-03', '2026-03-02'])
  })

  it('drops a 400 kcal crash day even when the next weigh-in fell a lot', () => {
    const days = [
      logged('2026-03-02', 400, 3, 80),
      day('2026-03-03', { weightKg: 79 }),
      logged('2026-03-04', 1800, 3, 79),
      day('2026-03-05', { weightKg: 78.7 }),
    ]

    const dates = suggestExemplaryDays(days, {
      referenceDate: '2026-03-10',
      dailyCalorieTargetKcal: 1800,
    }).map((candidate) => candidate.date)

    expect(dates).not.toContain('2026-03-02')
    expect(dates).toContain('2026-03-04')
  })

  it('drops days over the daily calorie target', () => {
    const days = [
      logged('2026-03-02', 2200, 3, 80),
      day('2026-03-03', { weightKg: 79.7 }),
    ]

    expect(
      suggestExemplaryDays(days, {
        referenceDate: '2026-03-10',
        dailyCalorieTargetKcal: 1800,
      }),
    ).toEqual([])
  })

  it('drops an unfinished log that only looks low-calorie', () => {
    const days = [
      day('2026-03-02', { weightKg: 80, calories: 400, mealCount: 1 }),
      day('2026-03-03', { weightKg: 79.5 }),
    ]

    expect(
      suggestExemplaryDays(days, {
        referenceDate: '2026-03-10',
        dailyCalorieTargetKcal: 1800,
      }),
    ).toEqual([])
  })

  it('requires at least 200 g loss to the next weigh-in', () => {
    const days = [
      logged('2026-03-02', 1800, 3, 80),
      day('2026-03-03', { weightKg: 79.85 }),
    ]

    expect(
      suggestExemplaryDays(days, {
        referenceDate: '2026-03-10',
        dailyCalorieTargetKcal: 1800,
      }),
    ).toEqual([])
  })

  it('without a calorie target, drops days in the bottom of the user\'s own logs', () => {
    const days = [
      logged('2026-03-02', 2000, 3, 80),
      logged('2026-03-03', 2100, 3, 79.7),
      logged('2026-03-04', 1900, 3, 79.4),
      logged('2026-03-05', 400, 3, 79.1),
      day('2026-03-06', { weightKg: 78.8 }),
    ]

    const dates = suggestExemplaryDays(days, {
      referenceDate: '2026-03-10',
    }).map((candidate) => candidate.date)

    expect(dates).not.toContain('2026-03-05')
    expect(dates).toContain('2026-03-04')
  })

  it('never returns a day the user dismissed', () => {
    const days = [
      logged('2026-03-02', 1800, 3, 80),
      day('2026-03-03', { weightKg: 79.7 }),
    ]

    expect(
      suggestExemplaryDays(days, {
        referenceDate: '2026-03-10',
        dailyCalorieTargetKcal: 1800,
        dismissedDates: ['2026-03-02'],
      }),
    ).toEqual([])
  })

  it('prefers the qualifying day nearest to the reference date', () => {
    const days = [
      logged('2018-01-10', 1800, 3, 90),
      day('2018-01-11', { weightKg: 89.7 }),
      logged('2026-03-02', 1800, 3, 80),
      day('2026-03-03', { weightKg: 79.7 }),
    ]

    expect(
      suggestExemplaryDays(days, {
        referenceDate: '2026-03-10',
        dailyCalorieTargetKcal: 1800,
      })[0]?.date,
    ).toBe('2026-03-02')
  })
})
