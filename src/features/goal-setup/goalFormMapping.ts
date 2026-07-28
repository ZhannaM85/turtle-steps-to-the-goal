import { format } from 'date-fns'
import type { Goal } from '@/domain/goal'
import { goalWeekEnd, kgToLb, lbToKg } from '@/domain/goal'
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
 * Whether `existingGoal`'s own 7-day window is still live today (#181) —
 * i.e. saving now should edit that same goal in place rather than
 * starting a new one. Deliberately keyed off the window, not the
 * calendar day: correcting Monday's target on Wednesday, still inside
 * the same week, is an edit; renewing after the window has run its
 * course is a genuinely new week's goal. A goal with no `weekStart` (pre-
 * #135) has no window to still be inside, so it's never editable this way
 * — the next save always starts a fresh, properly-anchored record.
 *
 * #155: a window also stops being "live" the moment its target is
 * actually reached, even mid-week — reaching a goal early and setting a
 * new one should start a fresh record, not silently overwrite the target
 * on the record that already succeeded. `activeGoalReached` is the
 * caller's own `goalWindowProgress(entries, existingGoal).metOnDate !==
 * null` (computed where `entries` is actually available, e.g.
 * `GoalScreen`) — this function stays entries-agnostic. The now-reached
 * record's own stored `weekStart`/shape isn't rewritten retroactively;
 * only this live/not-live decision at save time changes.
 */
/**
 * #382 — exported so `GoalForm` can tell, before any save happens, whether
 * this is the ambiguous case: a save here would silently edit the current
 * window in place rather than starting fresh, which read as impossible
 * ("target met" on a date before a "new" goal existed) to a user who
 * thinks of every save as setting a new goal. `GoalForm` uses this to
 * decide whether to offer an explicit "Start a new goal" button alongside
 * the normal one, rather than only ever resolving the choice automatically.
 */
export function isEditingLiveWindow(
  existingGoal: Goal | null,
  activeGoalReached: boolean,
): existingGoal is Goal & { weekStart: string } {
  if (!existingGoal?.weekStart) return false
  if (activeGoalReached) return false
  return format(new Date(), 'yyyy-MM-dd') <= goalWeekEnd(existingGoal.weekStart)
}

export function formValuesToGoal(
  values: GoalFormValues,
  unit: Unit,
  existingGoal: Goal | null = null,
  activeGoalReached = false,
  /** #382 — an explicit "Start a new goal" click overrides the automatic
   * edit-in-place resolution below, even while the current window is
   * still live and unreached. */
  forceNew = false,
): Goal {
  const toKg = (value: number) => (unit === 'lb' ? lbToKg(value) : value)
  const now = new Date().toISOString()

  if (!forceNew && isEditingLiveWindow(existingGoal, activeGoalReached)) {
    // Same id/createdAt/weekStart (#181) — editing the current week's
    // goal in place, not starting a new historical record. Dexie's put()
    // upserts by id, so this overwrites rather than inserting.
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
    // Fresh id + createdAt (#147) — no live window to edit, so this
    // becomes its own historical record. Either there's no active goal
    // yet, or the previous one's window has run its course and is now
    // finished/frozen in Past targets for good (#181).
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
