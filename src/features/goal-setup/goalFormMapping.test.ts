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
    startDate: '2026-01-01',
    startWeightKg: 80,
    targetWeightKg: 70,
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
      paceMode: 'weeklyLoss',
    })
  })

  it('maps a kg goal straight through', () => {
    const values = goalToFormValues(makeGoal())
    expect(values).toMatchObject({
      displayUnit: 'kg',
      startWeight: 80,
      targetWeight: 70,
      paceMode: 'weeklyLoss',
      targetWeeklyLoss: 1,
    })
  })

  it('converts a lb goal to lb display values', () => {
    const goal = makeGoal({
      displayUnit: 'lb',
      startWeightKg: 80,
      targetWeightKg: 70,
      targetWeeklyLossKg: 1,
    })
    const values = goalToFormValues(goal)

    expect(values.startWeight).toBeCloseTo(176.37, 1)
    expect(values.targetWeight).toBeCloseTo(154.32, 1)
  })

  it('uses targetDate pace mode when the goal has an explicit target date', () => {
    const values = goalToFormValues(makeGoal({ targetDate: '2026-06-01' }))
    expect(values.paceMode).toBe('targetDate')
    expect(values.targetDate).toBe('2026-06-01')
  })
})

describe('formValuesToGoal', () => {
  const baseValues: GoalFormValues = {
    displayUnit: 'kg',
    startWeight: 80,
    targetWeight: 70,
    paceMode: 'weeklyLoss',
    targetWeeklyLoss: 1,
  }

  it('creates a new goal with a fresh id and today as the start date', () => {
    const goal = formValuesToGoal(baseValues, null)

    expect(goal.id).toBeTruthy()
    expect(goal.startWeightKg).toBe(80)
    expect(goal.targetWeightKg).toBe(70)
    expect(goal.targetWeeklyLossKg).toBe(1)
    expect(goal.targetDate).toBeUndefined()
  })

  it('preserves id, startDate, and createdAt when editing an existing goal', () => {
    const existing = makeGoal({ id: 'existing-id', startDate: '2025-11-01' })
    const goal = formValuesToGoal(baseValues, existing)

    expect(goal.id).toBe('existing-id')
    expect(goal.startDate).toBe('2025-11-01')
    expect(goal.createdAt).toBe(existing.createdAt)
  })

  it('converts lb inputs to canonical kg', () => {
    const values: GoalFormValues = {
      ...baseValues,
      displayUnit: 'lb',
      startWeight: 176.37,
      targetWeight: 154.32,
      targetWeeklyLoss: 2.2,
    }
    const goal = formValuesToGoal(values, null)

    expect(goal.startWeightKg).toBeCloseTo(80, 1)
    expect(goal.targetWeightKg).toBeCloseTo(70, 1)
    expect(goal.targetWeeklyLossKg).toBeCloseTo(0.998, 2)
  })

  it('derives targetWeeklyLossKg from a target date in targetDate mode', () => {
    const values: GoalFormValues = {
      displayUnit: 'kg',
      startWeight: 80,
      targetWeight: 70,
      paceMode: 'targetDate',
      targetDate: '2026-03-12',
    }
    const goal = formValuesToGoal(values, makeGoal({ startDate: '2026-01-01' }))

    expect(goal.targetDate).toBe('2026-03-12')
    expect(goal.targetWeeklyLossKg).toBeCloseTo(1, 5)
  })
})

describe('effectiveWeeklyPaceKg', () => {
  it('returns null when the weekly pace field is empty', () => {
    expect(effectiveWeeklyPaceKg({ paceMode: 'weeklyLoss' }, null)).toBeNull()
  })

  it('reads the pace directly in weeklyLoss mode', () => {
    expect(
      effectiveWeeklyPaceKg(
        { paceMode: 'weeklyLoss', targetWeeklyLoss: 1.5, displayUnit: 'kg' },
        null,
      ),
    ).toBe(1.5)
  })

  it('converts lb pace to kg in weeklyLoss mode', () => {
    const pace = effectiveWeeklyPaceKg(
      { paceMode: 'weeklyLoss', targetWeeklyLoss: 2.2, displayUnit: 'lb' },
      null,
    )
    expect(pace).toBeCloseTo(0.998, 2)
  })

  it('returns null in targetDate mode until all fields are filled', () => {
    expect(
      effectiveWeeklyPaceKg(
        { paceMode: 'targetDate', startWeight: 80, displayUnit: 'kg' },
        null,
      ),
    ).toBeNull()
  })

  it('derives the pace in targetDate mode once all fields are filled', () => {
    const pace = effectiveWeeklyPaceKg(
      {
        paceMode: 'targetDate',
        displayUnit: 'kg',
        startWeight: 80,
        targetWeight: 70,
        targetDate: '2026-03-12',
      },
      makeGoal({ startDate: '2026-01-01' }),
    )
    expect(pace).toBeCloseTo(1, 5)
  })
})
