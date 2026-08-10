import { addDays, format, parseISO } from 'date-fns'
import type { Goal } from '@/domain/goal'
import { goalWeekEnd, kgToLb, lbToKg } from '@/domain/goal'
import type { Unit } from '@/stores'
import type { GoalFormValues } from './goalFormSchema'

/**
 * #671 — default for the form's editable "starts on" field (and the
 * stamp `formValuesToGoal` uses when the field is left at its default).
 * Usually today; bumped one day forward when restarting on the exact day
 * the previous goal's own weekEnd was reached, so the two inclusive
 * windows don't share that day (see `freshWeekStart` history in #671).
 */
export function defaultWeekStartDate(existingGoal: Goal | null = null): string {
  const today = format(new Date(), 'yyyy-MM-dd')
  if (!existingGoal?.weekStart) return today
  const existingWeekEnd =
    existingGoal.weekEnd ?? goalWeekEnd(existingGoal.weekStart)
  if (existingWeekEnd !== today) return today
  return format(addDays(parseISO(existingWeekEnd), 1), 'yyyy-MM-dd')
}

/**
 * #659 — default for the form's editable "ends on" field: the goal's own
 * `weekEnd` if it has one, else the fixed `weekStart + 6` window end. Falls
 * back to `defaultWeekStartDate(priorGoal) + 6` when there's no goal yet
 * (brand-new setup, or "Start a new goal") — so the end default tracks the
 * same start stamp a fresh save would use, including #671's one-day bump.
 */
export function defaultWeekEndDate(
  goal: Goal | null,
  priorGoal: Goal | null = null,
): string {
  if (goal?.weekEnd) return goal.weekEnd
  const weekStart = goal?.weekStart ?? defaultWeekStartDate(priorGoal)
  return goalWeekEnd(weekStart)
}

export function goalToFormValues(
  goal: Goal | null,
  unit: Unit,
  priorGoal: Goal | null = null,
): Partial<GoalFormValues> {
  if (!goal) {
    const weekStartDate = defaultWeekStartDate(priorGoal)
    return {
      weekStartDate,
      weekEndDate: goalWeekEnd(weekStartDate),
    }
  }

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
    weekStartDate: goal.weekStart ?? defaultWeekStartDate(null),
    weekEndDate: defaultWeekEndDate(goal),
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
  // #676 — the most recently known weight at save time, used only by the
  // fresh-record branch below to capture Goal.baselineWeightKg. Always kg
  // regardless of `unit` — same "unconverted" convention GoalForm's own
  // `latestWeightKg` prop already uses for its TDEE helper.
  latestWeightKg: number | null = null,
): Goal {
  const toKg = (value: number) => (unit === 'lb' ? lbToKg(value) : value)
  const now = new Date().toISOString()

  if (!startNew && existingGoal) {
    // Same id/createdAt (#181) — editing the current goal in place, not
    // starting a new historical record. Dexie's put() upserts by id.
    // #683 — weekStart is editable like weekEnd (#659); blank keeps the
    // previous stamp.
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
      weekStart: values.weekStartDate || existingGoal.weekStart,
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
    // #671 — prefer the form's editable start date (defaults via
    // `defaultWeekStartDate`, including the same-day-reach bump); fall
    // back to that helper if the field was cleared.
    weekStart: values.weekStartDate || defaultWeekStartDate(existingGoal),
    weekEnd: values.weekEndDate || undefined,
    // #676 — frozen once, here, at the moment this record is first
    // created; never touched again (the edit-in-place branch above spreads
    // `...existingGoal`, which already carries an existing snapshot
    // through untouched). `latestWeightKg` is whatever's most recently
    // known right now — the goal's own `weekStart` weigh-in if that's
    // already logged, else whatever came before it — same fallback #675
    // uses for the card's own display before a real snapshot exists.
    baselineWeightKg: latestWeightKg ?? undefined,
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
