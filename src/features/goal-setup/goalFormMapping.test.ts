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
    displayUnit: 'kg',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

describe('goalToFormValues', () => {
  it('returns sensible defaults when there is no existing goal', () => {
    expect(goalToFormValues(null)).toEqual({
      displayUnit: 'kg',
    })
  })

  it('maps a kg goal straight through', () => {
    const values = goalToFormValues(makeGoal())
    expect(values).toMatchObject({
      displayUnit: 'kg',
      targetWeeklyLoss: 1,
    })
  })

  it('converts a lb goal to lb display values', () => {
    const goal = makeGoal({ displayUnit: 'lb', targetWeeklyLossKg: 1 })
    const values = goalToFormValues(goal)

    expect(values.targetWeeklyLoss).toBeCloseTo(2.2, 1)
  })
})

describe('formValuesToGoal', () => {
  const baseValues: GoalFormValues = {
    displayUnit: 'kg',
    targetWeeklyLoss: 1,
  }

  it('creates a new goal with a fresh id', () => {
    const goal = formValuesToGoal(baseValues, null)

    expect(goal.id).toBeTruthy()
    expect(goal.targetWeeklyLossKg).toBe(1)
  })

  it('preserves id and createdAt when editing an existing goal', () => {
    const existing = makeGoal({ id: 'existing-id' })
    const goal = formValuesToGoal(baseValues, existing)

    expect(goal.id).toBe('existing-id')
    expect(goal.createdAt).toBe(existing.createdAt)
  })

  it('converts lb inputs to canonical kg', () => {
    const values: GoalFormValues = {
      displayUnit: 'lb',
      targetWeeklyLoss: 2.2,
    }
    const goal = formValuesToGoal(values, null)

    expect(goal.targetWeeklyLossKg).toBeCloseTo(0.998, 2)
  })
})

describe('effectiveWeeklyPaceKg', () => {
  it('returns null when the weekly target field is empty', () => {
    expect(effectiveWeeklyPaceKg({})).toBeNull()
  })

  it('reads the pace directly', () => {
    expect(
      effectiveWeeklyPaceKg({ targetWeeklyLoss: 1.5, displayUnit: 'kg' }),
    ).toBe(1.5)
  })

  it('converts lb pace to kg', () => {
    const pace = effectiveWeeklyPaceKg({
      targetWeeklyLoss: 2.2,
      displayUnit: 'lb',
    })
    expect(pace).toBeCloseTo(0.998, 2)
  })
})
