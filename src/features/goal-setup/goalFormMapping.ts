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
    dailyCalorieTarget: goal.dailyCalorieTargetKcal,
    dailyProteinTarget: goal.dailyProteinTargetG,
    dailyFatTarget: goal.dailyFatTargetG,
    dailyCarbTarget: goal.dailyCarbTargetG,
    dailyFiberTarget: goal.dailyFiberTargetG,
    dailyWaterTarget: goal.dailyWaterTargetMl,
  }
}

/**
 * #386 — reported live: the previous design (#181/#382) let a plain
 * "Update" save silently decide, based on internal reached/live-window
 * state invisible to the user, whether it edited the current goal in
 * place or quietly started a fresh one — confusing even to an experienced
 * user ("I just set a new goal" when it had actually kept editing an
 * already-succeeded old window in place, or vice versa). Replaced with two
 * always-available, explicit actions instead of one auto-resolving button:
 * `startNew=false` always edits `existingGoal` in place, unconditionally;
 * `startNew=true` always creates a fresh record. No more automatic
 * detection of "is this still live/already reached" at save time — that
 * data still drives the *display* of reached/nudge banners elsewhere, but
 * no longer decides which record a save touches.
 */
export function formValuesToGoal(
  values: GoalFormValues,
  unit: Unit,
  existingGoal: Goal | null = null,
  startNew = false,
): Goal {
  const toKg = (value: number) => (unit === 'lb' ? lbToKg(value) : value)
  const now = new Date().toISOString()

  if (!startNew && existingGoal) {
    // Same id/createdAt/weekStart (#181) — editing the current goal in
    // place, not starting a new historical record. Dexie's put() upserts
    // by id, so this overwrites rather than inserting.
    return {
      ...existingGoal,
      targetWeeklyLossKg: toKg(values.targetWeeklyLoss as number),
      dailyCalorieTargetKcal: values.dailyCalorieTarget,
      dailyProteinTargetG: values.dailyProteinTarget,
      dailyFatTargetG: values.dailyFatTarget,
      dailyCarbTargetG: values.dailyCarbTarget,
      dailyFiberTargetG: values.dailyFiberTarget,
      dailyWaterTargetMl: values.dailyWaterTarget,
      updatedAt: now,
    }
  }

  return {
    // Fresh id + createdAt (#147) — either there's no goal yet, or the
    // user explicitly asked to start a new one; either way this becomes
    // its own historical record. A newer `createdAt` than any existing
    // goal is all `pastGoals()`/`getActiveGoal()` need to treat the
    // previous one as closed/superseded (#386) — no separate status flag.
    id: crypto.randomUUID(),
    targetWeeklyLossKg: toKg(values.targetWeeklyLoss as number),
    dailyCalorieTargetKcal: values.dailyCalorieTarget,
    dailyProteinTargetG: values.dailyProteinTarget,
    dailyFatTargetG: values.dailyFatTarget,
    dailyCarbTargetG: values.dailyCarbTarget,
    dailyFiberTargetG: values.dailyFiberTarget,
    dailyWaterTargetMl: values.dailyWaterTarget,
    // Always today (#135) — every *new* record starts a fresh 7-day
    // tracking window from the moment it's actually saved.
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
