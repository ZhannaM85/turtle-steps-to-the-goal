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

function logged(date: string, calories: number, mealCount = 3): ExemplaryDayInput {
  return { date, calories, mealCount }
}

describe('suggestExemplaryDays (#1125)', () => {
  it('picks a filled-in day inside a stretch near the weekly pace', () => {
    const days = [
      day('2026-03-02', { weightKg: 80, calories: 1800, mealCount: 3 }),
      logged('2026-03-04', 1900),
      day('2026-03-09', { weightKg: 79.5 }),
    ]

    const candidates = suggestExemplaryDays(days, {
      targetWeeklyLossKg: 0.5,
      dailyCalorieTargetKcal: 1800,
    })

    expect(candidates[0]).toMatchObject({
      date: '2026-03-02',
      calories: 1800,
      weightChangeKg: -0.5,
    })
    expect(candidates.map((candidate) => candidate.date)).toContain('2026-03-04')
  })

  it('drops a 400 kcal day and a stretch that lost much faster than the target', () => {
    const days = [
      day('2026-03-02', { weightKg: 80 }),
      logged('2026-03-03', 400),
      day('2026-03-09', { weightKg: 79.5 }),
      logged('2026-03-10', 1800),
      day('2026-03-16', { weightKg: 77.5 }),
    ]

    expect(
      suggestExemplaryDays(days, {
        targetWeeklyLossKg: 0.5,
        dailyCalorieTargetKcal: 1800,
      }),
    ).toEqual([])
  })

  it('drops an unfinished log that only looks low-calorie', () => {
    const days = [
      day('2026-03-02', { weightKg: 80 }),
      day('2026-03-03', { calories: 400, mealCount: 1 }),
      day('2026-03-09', { weightKg: 79.5 }),
    ]

    expect(
      suggestExemplaryDays(days, {
        targetWeeklyLossKg: 0.5,
        dailyCalorieTargetKcal: 1800,
      }),
    ).toEqual([])
  })

  it('without a calorie target, drops days in the bottom of the user\'s own logs', () => {
    const days = [
      day('2026-03-02', { weightKg: 80 }),
      logged('2026-03-02', 2000),
      logged('2026-03-03', 2100),
      logged('2026-03-04', 1900),
      logged('2026-03-05', 400),
      day('2026-03-09', { weightKg: 79.5 }),
    ]

    const dates = suggestExemplaryDays(days, {
      targetWeeklyLossKg: 0.5,
    }).map((candidate) => candidate.date)

    expect(dates).not.toContain('2026-03-05')
    expect(dates).toContain('2026-03-03')
  })

  it('never returns a day the user dismissed', () => {
    const days = [
      day('2026-03-02', { weightKg: 80 }),
      logged('2026-03-03', 1800),
      day('2026-03-09', { weightKg: 79.5 }),
    ]

    expect(
      suggestExemplaryDays(days, {
        targetWeeklyLossKg: 0.5,
        dailyCalorieTargetKcal: 1800,
        dismissedDates: ['2026-03-03'],
      }),
    ).toEqual([])
  })

  it('uses the days before the later morning weigh-in', () => {
    const days = [
      day('2026-03-02', { weightKg: 80 }),
      logged('2026-03-02', 1800),
      day('2026-03-03', { weightKg: 79.93 }),
      logged('2026-03-03', 1800),
    ]

    expect(
      suggestExemplaryDays(days, {
        targetWeeklyLossKg: 0.5,
        dailyCalorieTargetKcal: 1800,
      }).map((candidate) => candidate.date),
    ).toEqual(['2026-03-02'])
  })
})
