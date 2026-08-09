import { format, subDays } from 'date-fns'
import { describe, expect, it } from 'vitest'
import { goalWeekEnd, type Goal } from '@/domain/goal'
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
    const today = format(new Date(), 'yyyy-MM-dd')
    expect(goalToFormValues(null, 'kg')).toEqual({
      weekEndDate: goalWeekEnd(today),
    })
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

  it('maps the optional daily protein target straight through when set (#220)', () => {
    const values = goalToFormValues(
      makeGoal({ dailyProteinTargetG: 120 }),
      'kg',
    )
    expect(values.dailyProteinTarget).toBe(120)
  })

  it('leaves the daily protein target undefined when not set (#220)', () => {
    const values = goalToFormValues(makeGoal(), 'kg')
    expect(values.dailyProteinTarget).toBeUndefined()
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

  it('carries the optional daily protein target through to a fresh record (#220)', () => {
    const goal = formValuesToGoal(
      { targetWeeklyLoss: 1, dailyProteinTarget: 120 },
      'kg',
    )
    expect(goal.dailyProteinTargetG).toBe(120)
  })

  it('leaves the daily protein target undefined on a fresh record when not provided (#220)', () => {
    const goal = formValuesToGoal(baseValues, 'kg')
    expect(goal.dailyProteinTargetG).toBeUndefined()
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

    it('updates the daily protein target in place too (#220)', () => {
      const today = format(new Date(), 'yyyy-MM-dd')
      const existingGoal = makeGoal({
        id: 'goal-1',
        weekStart: today,
        dailyProteinTargetG: 100,
      })

      const goal = formValuesToGoal(
        { targetWeeklyLoss: 1, dailyProteinTarget: 130 },
        'kg',
        existingGoal,
      )

      expect(goal.dailyProteinTargetG).toBe(130)
    })

    it('clears a previously-set daily protein target when the field is left blank (#220)', () => {
      const today = format(new Date(), 'yyyy-MM-dd')
      const existingGoal = makeGoal({
        id: 'goal-1',
        weekStart: today,
        dailyProteinTargetG: 100,
      })

      const goal = formValuesToGoal(
        { targetWeeklyLoss: 1, dailyProteinTarget: undefined },
        'kg',
        existingGoal,
      )

      expect(goal.dailyProteinTargetG).toBeUndefined()
    })

    // #386 — reported live: the previous auto-detection (#181/#155/#382)
    // silently decided, from internal reached/live-window state invisible
    // to the user, whether a plain save edited in place or started fresh —
    // confusing even to an experienced user. Editing now *always* edits in
    // place, unconditionally (no more "unless the window's ended/already
    // reached" carve-outs); only an explicit `startNew: true` from the
    // caller (the separate "Start a new goal" button) ever starts a fresh
    // record.
    it("still edits in place even once the existing goal's window has ended", () => {
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

      expect(goal.id).toBe('goal-1')
      expect(goal.weekStart).toBe(longAgo)
    })

    it('still edits in place for a legacy existing goal with no weekStart', () => {
      const existingGoal = makeGoal({ id: 'goal-1', weekStart: undefined })

      const goal = formValuesToGoal(
        { targetWeeklyLoss: 2 },
        'kg',
        existingGoal,
      )

      expect(goal.id).toBe('goal-1')
      expect(goal.weekStart).toBeUndefined()
    })

    it('still edits in place even when the goal was already reached mid-week (#155)', () => {
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
      )

      expect(goal.id).toBe('goal-1')
    })

    it('defaults startNew to false, editing in place by default', () => {
      const today = format(new Date(), 'yyyy-MM-dd')
      const existingGoal = makeGoal({ id: 'goal-1', weekStart: today })

      const goal = formValuesToGoal({ targetWeeklyLoss: 2 }, 'kg', existingGoal)

      expect(goal.id).toBe('goal-1')
    })

    it('starts a fresh record when startNew is explicitly passed, even with a live unreached window (#386)', () => {
      const today = format(new Date(), 'yyyy-MM-dd')
      const existingGoal = makeGoal({
        id: 'goal-1',
        weekStart: today,
        targetWeeklyLossKg: 1,
      })

      const goal = formValuesToGoal(
        { targetWeeklyLoss: 0.1 },
        'kg',
        existingGoal,
        true,
      )

      expect(goal.id).not.toBe('goal-1')
      expect(goal.weekStart).toBe(today)
      expect(goal.targetWeeklyLossKg).toBe(0.1)
    })

    it('starts a fresh record when startNew is passed even for an already-ended window', () => {
      const longAgo = format(subDays(new Date(), 365), 'yyyy-MM-dd')
      const existingGoal = makeGoal({ id: 'goal-1', weekStart: longAgo })

      const goal = formValuesToGoal(
        { targetWeeklyLoss: 1 },
        'kg',
        existingGoal,
        true,
      )

      expect(goal.id).not.toBe('goal-1')
      expect(goal.weekStart).toBe(format(new Date(), 'yyyy-MM-dd'))
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
