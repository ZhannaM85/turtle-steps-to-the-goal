import { addDays, format, startOfISOWeek } from 'date-fns'
import { describe, expect, it } from 'vitest'
import type { CalorieEntry, CalorieItem, DailyEntry } from '@/domain/dailyEntry'
import type { Goal } from '@/domain/goal'
import { weeklySummaries } from './weeklySummaries'

function calories(
  amountKcal: number,
  macros: Partial<CalorieItem> = {},
): CalorieEntry[] {
  return [
    {
      id: crypto.randomUUID(),
      items: [{ id: crypto.randomUUID(), amountKcal, ...macros }],
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ]
}

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
    const entries = [
      entry(dayOf(WEEK_1_START, 0), { calorieEntries: calories(1900) }),
    ]

    const [summary] = weeklySummaries(entries)

    expect(summary.averageWeightKg).toBeNull()
    expect(summary.averageCalories).toBe(1900)
  })

  it('averages macros only over the days that logged each one (#53)', () => {
    const entries = [
      entry(dayOf(WEEK_1_START, 0), {
        calorieEntries: calories(1900, { proteinG: 100, fatG: 60 }),
      }),
      // No carbs logged all week; second day logs protein but not fat.
      entry(dayOf(WEEK_1_START, 1), {
        calorieEntries: calories(1800, { proteinG: 80 }),
      }),
    ]

    const [summary] = weeklySummaries(entries)

    expect(summary.averageProteinG).toBe(90) // (100 + 80) / 2
    expect(summary.averageFatG).toBe(60) // only one day logged fat
    expect(summary.averageCarbsG).toBeNull() // never logged
  })

  it('groups by a custom weekStartsOn instead of Monday (#85)', () => {
    // WEEK_1_START (Monday) + 2 = Wednesday. With weekStartsOn=3 (Wed), a
    // Tuesday entry belongs to the *prior* Wed-start week, not this one.
    const wednesday = dayOf(WEEK_1_START, 2)
    const tuesdayBefore = dayOf(WEEK_1_START, 1)
    const entries = [
      entry(tuesdayBefore, { weightKg: 70 }),
      entry(wednesday, { weightKg: 80 }),
    ]

    const summaries = weeklySummaries(entries, undefined, 3)

    expect(summaries).toHaveLength(2)
    expect(summaries[0].averageWeightKg).toBe(70)
    expect(summaries[1].weekStart).toBe(wednesday)
    expect(summaries[1].averageWeightKg).toBe(80)
  })
})
