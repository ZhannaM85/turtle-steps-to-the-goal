import { describe, expect, it } from 'vitest'
import type { CalorieEntry, DailyEntry } from '@/domain/dailyEntry'
import type { Goal } from './Goal'
import { goalWindowAverages } from './weeklyReviewAverages'

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'goal-1',
    targetWeeklyLossKg: 1,
    weekStart: '2026-03-02', // Monday
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function calories(amountKcal: number, proteinG: number): CalorieEntry[] {
  return [
    {
      id: crypto.randomUUID(),
      items: [{ id: crypto.randomUUID(), amountKcal, proteinG }],
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ]
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

describe('goalWindowAverages (#602)', () => {
  it('returns null averages when the goal has no weekStart', () => {
    const result = goalWindowAverages(
      [],
      makeGoal({ weekStart: undefined }),
      new Date('2026-03-04T12:00:00.000Z'),
    )
    expect(result).toEqual({ averageCalories: null, averageProteinG: null })
  })

  it('averages only the days logged so far within an in-progress window', () => {
    const entries = [
      entry('2026-03-02', { calorieEntries: calories(2000, 100) }),
      entry('2026-03-03', { calorieEntries: calories(1800, 80) }),
      // 2026-03-04 (today) not logged yet.
    ]
    const result = goalWindowAverages(
      entries,
      makeGoal(),
      new Date('2026-03-04T12:00:00.000Z'),
    )
    expect(result.averageCalories).toBe(1900)
    expect(result.averageProteinG).toBe(90)
  })

  it('averages the full finished window once weekEnd has passed', () => {
    const entries = [
      entry('2026-03-02', { calorieEntries: calories(2000, 100) }),
      entry('2026-03-08', { calorieEntries: calories(1600, 80) }), // week's Sunday
    ]
    const result = goalWindowAverages(
      entries,
      makeGoal(),
      new Date('2026-03-15T12:00:00.000Z'), // well past weekEnd
    )
    expect(result.averageCalories).toBe(1800)
  })

  it('returns null averages when nothing has been logged in the window yet', () => {
    const result = goalWindowAverages(
      [],
      makeGoal(),
      new Date('2026-03-02T12:00:00.000Z'),
    )
    expect(result).toEqual({ averageCalories: null, averageProteinG: null })
  })
})
