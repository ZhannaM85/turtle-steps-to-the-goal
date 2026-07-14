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

export function formValuesToGoal(
  values: GoalFormValues,
  existingGoal: Goal | null,
  unit: Unit,
): Goal {
  const toKg = (value: number) => (unit === 'lb' ? lbToKg(value) : value)

  const now = new Date().toISOString()

  return {
    id: existingGoal?.id ?? crypto.randomUUID(),
    targetWeeklyLossKg: toKg(values.targetWeeklyLoss as number),
    createdAt: existingGoal?.createdAt ?? now,
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
