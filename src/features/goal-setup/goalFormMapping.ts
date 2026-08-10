import { addDays, format, parseISO } from 'date-fns'
import type { Goal } from '@/domain/goal'
import { goalWeekEnd, kgToLb, lbToKg } from '@/domain/goal'
import type { Unit } from '@/stores'
import type { GoalFormValues } from './goalFormSchema'

/**
 * #659 — default for the form's editable "ends on" field: the goal's own
 * `weekEnd` if it has one, else the fixed `weekStart + 6` window end. Falls
 * back to today's own `weekStart + 6` when there's no goal yet (brand-new
 * setup, or "Start a new goal") — the same date `formValuesToGoal` below
 * stamps a fresh record's `weekStart` to on save, so the field's default
 * matches what that save would actually produce.
 */
export function defaultWeekEndDate(goal: Goal | null): string {
  if (goal?.weekEnd) return goal.weekEnd
  const weekStart = goal?.weekStart ?? format(new Date(), 'yyyy-MM-dd')
  return goalWeekEnd(weekStart)
}

export function goalToFormValues(
  goal: Goal | null,
  unit: Unit,
): Partial<GoalFormValues> {
  if (!goal) return { weekEndDate: defaultWeekEndDate(null) }

  const fromKg = (kg: number) => (unit === 'lb' ? kgToLb(kg) : kg)

  return {
    targetWeeklyLoss: fromKg(goal.targetWeeklyLossKg),
    dailyCalorieTarget: goal.dailyCalorieTargetKcal,
    dailyProteinTarget: goal.dailyProteinTargetG,
    dailyFatTarget: goal.dailyFatTargetG,
    dailyCarbTarget: goal.dailyCarbTargetG,
    dailyFiberTarget: goal.dailyFiberTargetG,
    dailySodiumTarget: goal.dailySodiumTargetMg,
    dailyPotassiumTarget: goal.dailyPotassiumTargetMg,
    dailyMagnesiumTarget: goal.dailyMagnesiumTargetMg,
    dailyWaterTarget: goal.dailyWaterTargetMl,
    weekEndDate: defaultWeekEndDate(goal),
  }
}

/**
 * #671 — a fresh record's weekStart defaults to today, but #667 unlocked
 * restarting on the exact day the old goal's own weekEnd was reached
 * (GoalForm's "Start a new goal" button only enables once
 * `goalWindowConcluded`, which is true either once the calendar has passed
 * weekEnd or once weekEnd is reached today), so "today" can now equal
 * existingGoal's weekEnd — giving the new goal weekStart === old goal's
 * weekEnd, a one-day overlap in the two windows' inclusive
 * [weekStart, weekEnd] ranges. Only that exact same-day case is bumped, to
 * the day right after; an already-ended window's weekEnd already sits
 * before today (no overlap risk), and a genuinely still-live window
 * shouldn't reach this function at all given the button's own gating, so
 * #386's plain "always today" behavior is otherwise unchanged.
 */
function freshWeekStart(existingGoal: Goal | null): string {
  const today = format(new Date(), 'yyyy-MM-dd')
  if (!existingGoal?.weekStart) return today
  const existingWeekEnd =
    existingGoal.weekEnd ?? goalWeekEnd(existingGoal.weekStart)
  if (existingWeekEnd !== today) return today
  return format(addDays(parseISO(existingWeekEnd), 1), 'yyyy-MM-dd')
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
      dailySodiumTargetMg: values.dailySodiumTarget,
      dailyPotassiumTargetMg: values.dailyPotassiumTarget,
      dailyMagnesiumTargetMg: values.dailyMagnesiumTarget,
      dailyWaterTargetMl: values.dailyWaterTarget,
      weekEnd: values.weekEndDate || undefined,
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
    dailySodiumTargetMg: values.dailySodiumTarget,
    dailyPotassiumTargetMg: values.dailyPotassiumTarget,
    dailyMagnesiumTargetMg: values.dailyMagnesiumTarget,
    dailyWaterTargetMl: values.dailyWaterTarget,
    // Today (#135) — every *new* record starts a fresh 7-day tracking
    // window from the moment it's actually saved. #671: bumped forward a
    // day when today would otherwise overlap existingGoal's own window —
    // see freshWeekStart above.
    weekStart: freshWeekStart(existingGoal),
    weekEnd: values.weekEndDate || undefined,
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
