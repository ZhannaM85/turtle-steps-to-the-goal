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
function isEditingLiveWindow(
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
): Goal {
  const toKg = (value: number) => (unit === 'lb' ? lbToKg(value) : value)
  const now = new Date().toISOString()

  if (isEditingLiveWindow(existingGoal, activeGoalReached)) {
    // Same id/createdAt/weekStart (#181) — editing the current week's
    // goal in place, not starting a new historical record. Dexie's put()
    // upserts by id, so this overwrites rather than inserting.
    return {
      ...existingGoal,
      targetWeeklyLossKg: toKg(values.targetWeeklyLoss as number),
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
