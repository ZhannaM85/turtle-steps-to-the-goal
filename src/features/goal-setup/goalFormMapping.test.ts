import { format, subDays } from 'date-fns'
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

  it('maps the optional daily calorie target straight through when set (#208)', () => {
    const values = goalToFormValues(
      makeGoal({ dailyCalorieTargetKcal: 1800 }),
      'kg',
    )
    expect(values.dailyCalorieTarget).toBe(1800)
  })

  it('leaves the daily calorie target undefined when not set (#208)', () => {
    const values = goalToFormValues(makeGoal(), 'kg')
    expect(values.dailyCalorieTarget).toBeUndefined()
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

  it('carries the optional daily calorie target through to a fresh record (#208)', () => {
    const goal = formValuesToGoal(
      { targetWeeklyLoss: 1, dailyCalorieTarget: 1800 },
      'kg',
    )
    expect(goal.dailyCalorieTargetKcal).toBe(1800)
  })

  it('leaves the daily calorie target undefined on a fresh record when not provided (#208)', () => {
    const goal = formValuesToGoal(baseValues, 'kg')
    expect(goal.dailyCalorieTargetKcal).toBeUndefined()
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

    it('updates the daily calorie target in place too (#208)', () => {
      const today = format(new Date(), 'yyyy-MM-dd')
      const existingGoal = makeGoal({
        id: 'goal-1',
        weekStart: today,
        dailyCalorieTargetKcal: 1800,
      })

      const goal = formValuesToGoal(
        { targetWeeklyLoss: 1, dailyCalorieTarget: 2000 },
        'kg',
        existingGoal,
      )

      expect(goal.dailyCalorieTargetKcal).toBe(2000)
    })

    it('clears a previously-set daily calorie target when the field is left blank (#208)', () => {
      const today = format(new Date(), 'yyyy-MM-dd')
      const existingGoal = makeGoal({
        id: 'goal-1',
        weekStart: today,
        dailyCalorieTargetKcal: 1800,
      })

      const goal = formValuesToGoal(
        { targetWeeklyLoss: 1, dailyCalorieTarget: undefined },
        'kg',
        existingGoal,
      )

      expect(goal.dailyCalorieTargetKcal).toBeUndefined()
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

    it('starts a fresh record when the window is calendar-live but already reached (#155)', () => {
      const today = format(new Date(), 'yyyy-MM-dd')
      const existingGoal = makeGoal({
        id: 'goal-1',
        weekStart: today,
        targetWeeklyLossKg: 0.5,
      })

      const goal = formValuesToGoal(
        { targetWeeklyLoss: 0.5 },
        'kg',
        existingGoal,
        true,
      )

      expect(goal.id).not.toBe('goal-1')
      expect(goal.weekStart).toBe(today)
    })

    it('defaults activeGoalReached to false, preserving the pre-#155 edit-in-place behavior', () => {
      const today = format(new Date(), 'yyyy-MM-dd')
      const existingGoal = makeGoal({ id: 'goal-1', weekStart: today })

      const goal = formValuesToGoal({ targetWeeklyLoss: 2 }, 'kg', existingGoal)

      expect(goal.id).toBe('goal-1')
    })

    it("re-saving the same value in place is a harmless idempotent update, not blocked (#182)", () => {
      const today = format(new Date(), 'yyyy-MM-dd')
      const existingGoal = makeGoal({
        id: 'goal-1',
        weekStart: today,
        targetWeeklyLossKg: 1,
      })

      const goal = formValuesToGoal(
        { targetWeeklyLoss: 1 },
        'kg',
        existingGoal,
      )

      expect(goal.id).toBe('goal-1')
      expect(goal.targetWeeklyLossKg).toBe(1)
    })
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
