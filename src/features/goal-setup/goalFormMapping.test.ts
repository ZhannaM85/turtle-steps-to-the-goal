import { format, subDays } from 'date-fns'
import { describe, expect, it } from 'vitest'
import type { Goal } from '@/domain/goal'
import {
  effectiveWeeklyPaceKg,
  formValuesToGoal,
  goalToFormValues,
  isUnchangedGoalEdit,
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

  it('creates a new goal with a fresh id when there is no existing goal', () => {
    const goal = formValuesToGoal(baseValues, 'kg')

    expect(goal.id).toBeTruthy()
    expect(goal.targetWeeklyLossKg).toBe(1)
  })

  it('always creates a fresh id and createdAt with no existing goal (#147)', () => {
    const first = formValuesToGoal(baseValues, 'kg')
    const second = formValuesToGoal(baseValues, 'kg')

    expect(second.id).not.toBe(first.id)
  })

  it('always stamps weekStart to today when starting a fresh record (#135)', () => {
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

  describe('editing the current week in place (#181)', () => {
    it("reuses the same id/createdAt/weekStart when the existing goal's window is still live", () => {
      const today = format(new Date(), 'yyyy-MM-dd')
      const existingGoal = makeGoal({
        id: 'goal-1',
        weekStart: today,
        createdAt: '2026-01-01T00:00:00.000Z',
        targetWeeklyLossKg: 1,
      })

      const goal = formValuesToGoal(
        { targetWeeklyLoss: 2 },
        'kg',
        existingGoal,
      )

      expect(goal.id).toBe('goal-1')
      expect(goal.createdAt).toBe('2026-01-01T00:00:00.000Z')
      expect(goal.weekStart).toBe(today)
      expect(goal.targetWeeklyLossKg).toBe(2)
      expect(goal.updatedAt).not.toBe(existingGoal.updatedAt)
    })

    it("starts a fresh record once the existing goal's window has ended", () => {
      const longAgo = format(subDays(new Date(), 365), 'yyyy-MM-dd')
      const existingGoal = makeGoal({
        id: 'goal-1',
        weekStart: longAgo,
        createdAt: '2020-01-01T00:00:00.000Z',
      })

      const goal = formValuesToGoal(
        { targetWeeklyLoss: 2 },
        'kg',
        existingGoal,
      )

      expect(goal.id).not.toBe('goal-1')
      expect(goal.weekStart).toBe(format(new Date(), 'yyyy-MM-dd'))
    })

    it('starts a fresh record for a legacy existing goal with no weekStart', () => {
      const existingGoal = makeGoal({ id: 'goal-1', weekStart: undefined })

      const goal = formValuesToGoal(
        { targetWeeklyLoss: 2 },
        'kg',
        existingGoal,
      )

      expect(goal.id).not.toBe('goal-1')
    })
  })
})

describe('isUnchangedGoalEdit (#181, follow-up to #174)', () => {
  it("is unchanged when the target matches the live goal's own value", () => {
    const today = format(new Date(), 'yyyy-MM-dd')
    const existingGoal = makeGoal({ weekStart: today, targetWeeklyLossKg: 1 })

    expect(isUnchangedGoalEdit(1, existingGoal)).toBe(true)
  })

  it('is not unchanged when the target actually differs', () => {
    const today = format(new Date(), 'yyyy-MM-dd')
    const existingGoal = makeGoal({ weekStart: today, targetWeeklyLossKg: 1 })

    expect(isUnchangedGoalEdit(1.5, existingGoal)).toBe(false)
  })

  it('is not unchanged once the window has ended, even with the same target', () => {
    const longAgo = format(subDays(new Date(), 365), 'yyyy-MM-dd')
    const existingGoal = makeGoal({
      weekStart: longAgo,
      targetWeeklyLossKg: 1,
    })

    expect(isUnchangedGoalEdit(1, existingGoal)).toBe(false)
  })

  it('is never unchanged without an existing goal', () => {
    expect(isUnchangedGoalEdit(1, null)).toBe(false)
  })

  it('is never unchanged against a legacy goal with no weekStart', () => {
    const existingGoal = makeGoal({ weekStart: undefined, targetWeeklyLossKg: 1 })

    expect(isUnchangedGoalEdit(1, existingGoal)).toBe(false)
  })

  it('is never unchanged when the typed value is null (empty/invalid input)', () => {
    const today = format(new Date(), 'yyyy-MM-dd')
    const existingGoal = makeGoal({ weekStart: today, targetWeeklyLossKg: 1 })

    expect(isUnchangedGoalEdit(null, existingGoal)).toBe(false)
  })

  it('tolerates tiny float differences from a unit round-trip', () => {
    const today = format(new Date(), 'yyyy-MM-dd')
    const existingGoal = makeGoal({ weekStart: today, targetWeeklyLossKg: 1 })

    expect(isUnchangedGoalEdit(1.0002, existingGoal)).toBe(true)
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
