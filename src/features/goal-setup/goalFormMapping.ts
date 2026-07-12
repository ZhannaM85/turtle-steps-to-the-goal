import type { Goal } from '@/domain/goal'
import { kgToLb, lbToKg } from '@/domain/goal'
import type { GoalFormValues } from './goalFormSchema'

export function goalToFormValues(goal: Goal | null): Partial<GoalFormValues> {
  if (!goal) {
    return { displayUnit: 'kg' }
  }

  const fromKg = (kg: number) => (goal.displayUnit === 'lb' ? kgToLb(kg) : kg)

  return {
    displayUnit: goal.displayUnit,
    targetWeeklyLoss: fromKg(goal.targetWeeklyLossKg),
  }
}

export function formValuesToGoal(
  values: GoalFormValues,
  existingGoal: Goal | null,
): Goal {
  const toKg = (value: number) =>
    values.displayUnit === 'lb' ? lbToKg(value) : value

  const now = new Date().toISOString()

  return {
    id: existingGoal?.id ?? crypto.randomUUID(),
    targetWeeklyLossKg: toKg(values.targetWeeklyLoss as number),
    displayUnit: values.displayUnit,
    createdAt: existingGoal?.createdAt ?? now,
    updatedAt: now,
  }
}

/** Effective weekly kg pace implied by the current (possibly incomplete) form values, for live preview. */
export function effectiveWeeklyPaceKg(
  values: Partial<GoalFormValues>,
): number | null {
  const displayUnit = values.displayUnit ?? 'kg'
  const toKg = (value: number) => (displayUnit === 'lb' ? lbToKg(value) : value)

  const raw = Number(values.targetWeeklyLoss)
  if (!raw || Number.isNaN(raw)) return null
  return toKg(raw)
}
