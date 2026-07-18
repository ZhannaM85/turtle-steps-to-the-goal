import { useMemo } from 'react'
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

  function submit(formValues: GoalFormValues) {
    onSubmit(formValuesToGoal(formValues, unit))
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
    </form>
  )
}
