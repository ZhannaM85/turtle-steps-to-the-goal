import { useEffect, useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
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
  isDuplicateGoalSave,
} from './goalFormMapping'
import { makeGoalFormSchema, type GoalFormValues } from './goalFormSchema'

export interface GoalFormProps {
  existingGoal: Goal | null
  onSubmit: (goal: Goal) => void
}

export function GoalForm({ existingGoal, onSubmit }: GoalFormProps) {
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

  // Cleared on any edit (#174) — the notice is only meaningful for the
  // exact values that triggered it; once the user starts changing the
  // number it's a real edit again, not a duplicate.
  const [showDuplicateNotice, setShowDuplicateNotice] = useState(false)
  useEffect(() => {
    setShowDuplicateNotice(false)
  }, [values.targetWeeklyLoss])

  function submit(formValues: GoalFormValues) {
    const newGoal = formValuesToGoal(formValues, unit)
    if (isDuplicateGoalSave(newGoal, existingGoal)) {
      setShowDuplicateNotice(true)
      return
    }
    onSubmit(newGoal)
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

      <Button type="submit" className="self-start">
        {existingGoal ? t.goal.updateButton : t.goal.setButton}
      </Button>

      {showDuplicateNotice && (
        <p className="text-sm text-muted-foreground">
          {t.goal.duplicateTargetNotice}
        </p>
      )}
    </form>
  )
}
