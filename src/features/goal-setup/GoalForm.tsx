import { useEffect, useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check } from 'lucide-react'
import { useForm } from 'react-hook-form'
import type { Goal } from '@/domain/goal'
import { estimatedDailyCalorieDeficitKcal } from '@/domain/goal'
import { unitLabel, useTranslation } from '@/i18n'
import { parseNumberInput } from '@/shared/lib/parseNumberInput'
import { useUnitStore } from '@/stores'
import { Button } from '@/shared/ui/button'
import { NumberInput } from '@/shared/ui/number-input'
import {
  effectiveWeeklyPaceKg,
  formValuesToGoal,
  goalToFormValues,
} from './goalFormMapping'
import { makeGoalFormSchema, type GoalFormValues } from './goalFormSchema'

export interface GoalFormProps {
  existingGoal: Goal | null
  onSubmit: (goal: Goal) => void | Promise<void>
  /** #155: whether existingGoal's own window has already been reached
   * (goalWindowProgress(entries, existingGoal).metOnDate !== null) —
   * computed by the caller since this form has no access to entries.
   * Forces formValuesToGoal to start a fresh record instead of editing
   * the already-succeeded one in place. */
  activeGoalReached?: boolean
}

export function GoalForm({
  existingGoal,
  onSubmit,
  activeGoalReached = false,
}: GoalFormProps) {
  const t = useTranslation()
  const unit = useUnitStore((state) => state.unit)
  const schema = useMemo(() => makeGoalFormSchema(t), [t])

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<GoalFormValues>({
    resolver: zodResolver(schema),
    defaultValues: goalToFormValues(existingGoal, unit),
  })

  const values = watch()
  const paceKg = effectiveWeeklyPaceKg(values, unit)
  const dailyDeficit =
    paceKg !== null ? estimatedDailyCalorieDeficitKcal(paceKg) : null

  // #241: the button gave no visible confirmation after a successful save,
  // so a click could look like it did nothing. Brief "Saved" checkmark,
  // auto-clears rather than persisting indefinitely.
  const [justSaved, setJustSaved] = useState(false)

  useEffect(() => {
    if (!justSaved) return
    const timer = setTimeout(() => setJustSaved(false), 2000)
    return () => clearTimeout(timer)
  }, [justSaved])

  async function submit(formValues: GoalFormValues) {
    await onSubmit(
      formValuesToGoal(formValues, unit, existingGoal, activeGoalReached),
    )
    setJustSaved(true)
  }

  return (
    <form
      onSubmit={handleSubmit(submit)}
      className="flex flex-col gap-4"
      noValidate
    >
      <NumberInput
        label={t.goal.targetLabel(unitLabel(unit, t))}
        error={errors.targetWeeklyLoss?.message}
        {...register('targetWeeklyLoss', { setValueAs: parseNumberInput })}
      />

      {dailyDeficit !== null && (
        <p className="text-sm text-muted-foreground">
          {t.goal.deficitEstimate(
            Math.round(Math.abs(dailyDeficit)),
            dailyDeficit >= 0 ? 'deficit' : 'surplus',
          )}{' '}
          {t.goal.deficitCaveat}
        </p>
      )}

      {/* #208 — independent of the weekly weight-loss target above,
       * genuinely optional (no superRefine requiring it, unlike that
       * field), powers Today's "remaining calories" stat when set. */}
      <NumberInput
        label={t.goal.dailyCalorieTargetLabel}
        hint={t.goal.dailyCalorieTargetHint}
        unit={t.dailyEntry.kcalUnit}
        error={errors.dailyCalorieTarget?.message}
        {...register('dailyCalorieTarget', { setValueAs: parseNumberInput })}
      />

      {/* #220 — same shape as dailyCalorieTarget above, independent of it. */}
      <NumberInput
        label={t.goal.dailyProteinTargetLabel}
        hint={t.goal.dailyProteinTargetHint}
        unit={t.dailyEntry.gramsUnit}
        error={errors.dailyProteinTarget?.message}
        {...register('dailyProteinTarget', { setValueAs: parseNumberInput })}
      />

      <div className="flex items-center gap-2 self-start">
        <Button type="submit">
          {existingGoal ? t.goal.updateButton : t.goal.setButton}
        </Button>
        {justSaved && (
          <span
            role="status"
            className="flex items-center gap-1 text-sm text-muted-foreground"
          >
            <Check aria-hidden="true" className="size-4" />
            {t.goal.savedConfirmation}
          </span>
        )}
      </div>
    </form>
  )
}
