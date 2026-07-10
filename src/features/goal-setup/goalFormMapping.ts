import { format } from 'date-fns'
import type { Goal } from '@/domain/goal'
import { deriveWeeklyPaceKg, kgToLb, lbToKg } from '@/domain/goal'
import type { GoalFormValues } from './goalFormSchema'

export function goalToFormValues(goal: Goal | null): Partial<GoalFormValues> {
  if (!goal) {
    return { displayUnit: 'kg', paceMode: 'weeklyLoss' }
  }

  const fromKg = (kg: number) => (goal.displayUnit === 'lb' ? kgToLb(kg) : kg)

  return {
    displayUnit: goal.displayUnit,
    startWeight: fromKg(goal.startWeightKg),
    targetWeight: fromKg(goal.targetWeightKg),
    paceMode: goal.targetDate ? 'targetDate' : 'weeklyLoss',
    targetWeeklyLoss: fromKg(goal.targetWeeklyLossKg),
    targetDate: goal.targetDate,
  }
}

export function formValuesToGoal(
  values: GoalFormValues,
  existingGoal: Goal | null,
): Goal {
  const toKg = (value: number) =>
    values.displayUnit === 'lb' ? lbToKg(value) : value

  const startWeightKg = toKg(values.startWeight)
  const targetWeightKg = toKg(values.targetWeight)
  const startDate = existingGoal?.startDate ?? format(new Date(), 'yyyy-MM-dd')

  const targetWeeklyLossKg =
    values.paceMode === 'weeklyLoss'
      ? toKg(values.targetWeeklyLoss as number)
      : deriveWeeklyPaceKg(
          startDate,
          values.targetDate as string,
          startWeightKg,
          targetWeightKg,
        )

  const now = new Date().toISOString()

  return {
    id: existingGoal?.id ?? crypto.randomUUID(),
    startDate,
    startWeightKg,
    targetWeightKg,
    targetWeeklyLossKg,
    targetDate:
      values.paceMode === 'targetDate' ? values.targetDate : undefined,
    displayUnit: values.displayUnit,
    createdAt: existingGoal?.createdAt ?? now,
    updatedAt: now,
  }
}

/** Effective weekly kg pace implied by the current (possibly incomplete) form values, for live preview. */
export function effectiveWeeklyPaceKg(
  values: Partial<GoalFormValues>,
  existingGoal: Goal | null,
): number | null {
  const displayUnit = values.displayUnit ?? 'kg'
  const toKg = (value: number) => (displayUnit === 'lb' ? lbToKg(value) : value)

  if (values.paceMode === 'weeklyLoss') {
    const raw = Number(values.targetWeeklyLoss)
    if (!raw || Number.isNaN(raw)) return null
    return toKg(raw)
  }

  const startWeight = Number(values.startWeight)
  const targetWeight = Number(values.targetWeight)
  if (!values.targetDate || !startWeight || !targetWeight) return null

  const startDate = existingGoal?.startDate ?? format(new Date(), 'yyyy-MM-dd')
  const pace = deriveWeeklyPaceKg(
    startDate,
    values.targetDate,
    toKg(startWeight),
    toKg(targetWeight),
  )
  return pace || null
}
