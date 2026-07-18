import { format } from 'date-fns'
import { describe, expect, it } from 'vitest'
import type { Goal } from '@/domain/goal'
import {
  effectiveWeeklyPaceKg,
  formValuesToGoal,
  goalToFormValues,
} from './goalFormMapping'
import type { GoalFormValues } from './goalFormSchema'

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  const now = '2026-01-01T00:00:00.000Z'
  return {
    id: 'goal-1',
    targetWeeklyLossKg: 1,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

describe('goalToFormValues', () => {
  it('returns sensible defaults when there is no existing goal', () => {
    expect(goalToFormValues(null, 'kg')).toEqual({})
  })

  it('maps a kg goal straight through', () => {
    const values = goalToFormValues(makeGoal(), 'kg')
    expect(values).toMatchObject({
      targetWeeklyLoss: 1,
    })
  })

  it('converts to lb display values when the unit is lb', () => {
    const values = goalToFormValues(makeGoal({ targetWeeklyLossKg: 1 }), 'lb')

    expect(values.targetWeeklyLoss).toBeCloseTo(2.2, 1)
  })
})

describe('formValuesToGoal', () => {
  const baseValues: GoalFormValues = {
    targetWeeklyLoss: 1,
  }

  it('creates a new goal with a fresh id', () => {
    const goal = formValuesToGoal(baseValues, 'kg')

    expect(goal.id).toBeTruthy()
    expect(goal.targetWeeklyLossKg).toBe(1)
  })

  it('always creates a fresh id and createdAt, never overwriting a previous save (#147)', () => {
    const first = formValuesToGoal(baseValues, 'kg')
    const second = formValuesToGoal(baseValues, 'kg')

    // Every save is its own historical record — GoalRepository.getAll()
    // (used by the goal-history view) depends on each save getting a
    // distinct id rather than reusing the previous goal's, which would
    // silently overwrite it (Dexie `put` upserts by id).
    expect(second.id).not.toBe(first.id)
  })

  it('always stamps weekStart to today (#135)', () => {
    const today = format(new Date(), 'yyyy-MM-dd')

    const goal = formValuesToGoal(baseValues, 'kg')
    expect(goal.weekStart).toBe(today)
  })

  it('converts lb inputs to canonical kg', () => {
    const values: GoalFormValues = {
      targetWeeklyLoss: 2.2,
    }
    const goal = formValuesToGoal(values, 'lb')

    expect(goal.targetWeeklyLossKg).toBeCloseTo(0.998, 2)
  })
})

describe('effectiveWeeklyPaceKg', () => {
  it('returns null when the weekly target field is empty', () => {
    expect(effectiveWeeklyPaceKg({}, 'kg')).toBeNull()
  })

  it('reads the pace directly', () => {
    expect(effectiveWeeklyPaceKg({ targetWeeklyLoss: 1.5 }, 'kg')).toBe(1.5)
  })

  it('converts lb pace to kg', () => {
    const pace = effectiveWeeklyPaceKg({ targetWeeklyLoss: 2.2 }, 'lb')
    expect(pace).toBeCloseTo(0.998, 2)
  })
})
