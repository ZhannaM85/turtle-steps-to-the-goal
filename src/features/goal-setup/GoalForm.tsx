import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import type { Goal } from '@/domain/goal'
import { estimatedDailyCalorieDeficitKcal } from '@/domain/goal'
import { parseNumberInput } from '@/shared/lib/parseNumberInput'
import { Button } from '@/shared/ui/button'
import { NumberInput } from '@/shared/ui/number-input'
import {
  effectiveWeeklyPaceKg,
  formValuesToGoal,
  goalToFormValues,
} from './goalFormMapping'
import { goalFormSchema, type GoalFormValues } from './goalFormSchema'

export interface GoalFormProps {
  existingGoal: Goal | null
  onSubmit: (goal: Goal) => void
}

export function GoalForm({ existingGoal, onSubmit }: GoalFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<GoalFormValues>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: goalToFormValues(existingGoal),
  })

  const values = watch()
  const unit = values.displayUnit ?? 'kg'
  const paceKg = effectiveWeeklyPaceKg(values)
  const dailyDeficit =
    paceKg !== null ? estimatedDailyCalorieDeficitKcal(paceKg) : null

  function submit(formValues: GoalFormValues) {
    onSubmit(formValuesToGoal(formValues, existingGoal))
  }

  return (
    <form
      onSubmit={handleSubmit(submit)}
      className="flex flex-col gap-4"
      noValidate
    >
      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-sm font-medium">Units</legend>
        <div className="flex gap-4">
          <label className="flex items-center gap-1.5 text-sm">
            <input type="radio" value="kg" {...register('displayUnit')} /> kg
          </label>
          <label className="flex items-center gap-1.5 text-sm">
            <input type="radio" value="lb" {...register('displayUnit')} /> lb
          </label>
        </div>
      </fieldset>

      <NumberInput
        label={`This week's target (${unit} to lose)`}
        error={errors.targetWeeklyLoss?.message}
        {...register('targetWeeklyLoss', { setValueAs: parseNumberInput })}
      />

      {dailyDeficit !== null && (
        <p className="text-sm text-muted-foreground">
          Rough estimate: about {Math.round(Math.abs(dailyDeficit))} kcal/day{' '}
          {dailyDeficit >= 0 ? 'deficit' : 'surplus'}. This is a simple
          arithmetic estimate (~7700 kcal ≈ 1kg of fat), not medical or
          nutritional advice.
        </p>
      )}

      <Button type="submit" className="self-start">
        {existingGoal ? 'Update this week’s target' : 'Set this week’s target'}
      </Button>
    </form>
  )
}
