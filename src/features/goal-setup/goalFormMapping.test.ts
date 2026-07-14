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
    const goal = formValuesToGoal(baseValues, null, 'kg')

    expect(goal.id).toBeTruthy()
    expect(goal.targetWeeklyLossKg).toBe(1)
  })

  it('preserves id and createdAt when editing an existing goal', () => {
    const existing = makeGoal({ id: 'existing-id' })
    const goal = formValuesToGoal(baseValues, existing, 'kg')

    expect(goal.id).toBe('existing-id')
    expect(goal.createdAt).toBe(existing.createdAt)
  })

  it('converts lb inputs to canonical kg', () => {
    const values: GoalFormValues = {
      targetWeeklyLoss: 2.2,
    }
    const goal = formValuesToGoal(values, null, 'lb')

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
