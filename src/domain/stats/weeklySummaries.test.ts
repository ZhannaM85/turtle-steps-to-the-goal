import { addDays, format, startOfISOWeek } from 'date-fns'
import { describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import type { Goal } from '@/domain/goal'
import { weeklySummaries } from './weeklySummaries'

const DATE_FORMAT = 'yyyy-MM-dd'

// A known Monday, used as a stable anchor so tests don't depend on "today".
const WEEK_1_START = format(
  startOfISOWeek(new Date('2026-03-02T00:00:00.000Z')),
  DATE_FORMAT,
)

function dayOf(weekStartIso: string, offset: number): string {
  return format(
    addDays(new Date(`${weekStartIso}T00:00:00.000Z`), offset),
    DATE_FORMAT,
  )
}

let idCounter = 0
function entry(date: string, overrides: Partial<DailyEntry> = {}): DailyEntry {
  idCounter += 1
  const now = '2026-01-01T00:00:00.000Z'
  return {
    id: `entry-${idCounter}`,
    date,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'goal-1',
    targetWeeklyLossKg: 1,
    displayUnit: 'kg',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('weeklySummaries', () => {
  it('returns an empty array for no entries', () => {
    expect(weeklySummaries([])).toEqual([])
  })

  it('handles a single week with a single data point (no prior week to compare)', () => {
    const entries = [entry(dayOf(WEEK_1_START, 0), { weightKg: 80 })]

    const [summary] = weeklySummaries(entries)

    expect(summary.averageWeightKg).toBe(80)
    expect(summary.deltaVsPriorWeekKg).toBeNull()
    expect(summary.targetMet).toBeNull()
  })

  it('averages only the days that were actually logged (missing days)', () => {
    const entries = [
      entry(dayOf(WEEK_1_START, 0), { weightKg: 80 }),
      // days 1-5 not logged
      entry(dayOf(WEEK_1_START, 6), { weightKg: 82 }),
    ]

    const [summary] = weeklySummaries(entries)

    expect(summary.averageWeightKg).toBe(81)
  })

  it('computes delta and targetMet across two weeks', () => {
    const week2Start = dayOf(WEEK_1_START, 7)
    const entries = [
      entry(dayOf(WEEK_1_START, 0), { weightKg: 80 }),
      entry(dayOf(WEEK_1_START, 1), { weightKg: 82 }),
      entry(dayOf(week2Start, 0), { weightKg: 79 }),
      entry(dayOf(week2Start, 1), { weightKg: 77 }),
    ]

    const [week1, week2] = weeklySummaries(
      entries,
      makeGoal({ targetWeeklyLossKg: 1 }),
    )

    expect(week1.averageWeightKg).toBe(81)
    expect(week2.averageWeightKg).toBe(78)
    expect(week2.deltaVsPriorWeekKg).toBe(-3)
    expect(week2.targetMet).toBe(true) // lost 3kg, target was 1kg
  })

  it('reports targetMet false when there is no variance (no weight change)', () => {
    const week2Start = dayOf(WEEK_1_START, 7)
    const entries = [
      entry(dayOf(WEEK_1_START, 0), { weightKg: 80 }),
      entry(dayOf(week2Start, 0), { weightKg: 80 }),
    ]

    const [, week2] = weeklySummaries(
      entries,
      makeGoal({ targetWeeklyLossKg: 1 }),
    )

    expect(week2.deltaVsPriorWeekKg).toBe(0)
    expect(week2.targetMet).toBe(false)
  })

  it('leaves targetMet null when no goal is provided', () => {
    const week2Start = dayOf(WEEK_1_START, 7)
    const entries = [
      entry(dayOf(WEEK_1_START, 0), { weightKg: 80 }),
      entry(dayOf(week2Start, 0), { weightKg: 75 }),
    ]

    const [, week2] = weeklySummaries(entries)

    expect(week2.deltaVsPriorWeekKg).toBe(-5)
    expect(week2.targetMet).toBeNull()
  })

  it('keeps averageWeightKg null for a week where only calories were logged', () => {
    const entries = [entry(dayOf(WEEK_1_START, 0), { caloriesConsumed: 1900 })]

    const [summary] = weeklySummaries(entries)

    expect(summary.averageWeightKg).toBeNull()
    expect(summary.averageCalories).toBe(1900)
  })
})
