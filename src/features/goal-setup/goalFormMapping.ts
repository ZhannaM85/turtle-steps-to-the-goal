import { format } from 'date-fns'
import type { Goal } from '@/domain/goal'
import { kgToLb, lbToKg } from '@/domain/goal'
import type { Unit } from '@/stores'
import type { GoalFormValues } from './goalFormSchema'

export function goalToFormValues(
  goal: Goal | null,
  unit: Unit,
): Partial<GoalFormValues> {
  if (!goal) return {}

  const fromKg = (kg: number) => (unit === 'lb' ? kgToLb(kg) : kg)

  return {
    targetWeeklyLoss: fromKg(goal.targetWeeklyLossKg),
  }
}

export function formValuesToGoal(values: GoalFormValues, unit: Unit): Goal {
  const toKg = (value: number) => (unit === 'lb' ? lbToKg(value) : value)

  const now = new Date().toISOString()

  return {
    // Always a fresh id + createdAt (#147), never carried over from
    // existingGoal — every save becomes its own historical record instead
    // of overwriting the previous one, so past targets stay visible
    // (GoalRepository.getAll()) rather than being silently replaced.
    // getActiveGoal() keeps returning the right goal for free: it's just
    // "most recent by createdAt," which a fresh createdAt naturally wins.
    id: crypto.randomUUID(),
    targetWeeklyLossKg: toKg(values.targetWeeklyLoss as number),
    // Always today (#135) — every save starts a fresh 7-day tracking
    // window from the moment it's actually saved, rather than the
    // window's start silently staying wherever the goal was first
    // created.
    weekStart: format(new Date(), 'yyyy-MM-dd'),
    createdAt: now,
    updatedAt: now,
  }
}

/** Effective weekly kg pace implied by the current (possibly incomplete) form values, for live preview. */
export function effectiveWeeklyPaceKg(
  values: Partial<GoalFormValues>,
  unit: Unit,
): number | null {
  const toKg = (value: number) => (unit === 'lb' ? lbToKg(value) : value)

  const raw = Number(values.targetWeeklyLoss)
  if (!raw || Number.isNaN(raw)) return null
  return toKg(raw)
}
