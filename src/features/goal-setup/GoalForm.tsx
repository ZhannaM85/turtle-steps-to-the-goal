import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import type { Goal } from '@/domain/goal'
import { estimatedDailyCalorieDeficitKcal } from '@/domain/goal'
import { Button } from '@/shared/ui/button'
import { NumberInput } from '@/shared/ui/number-input'
import { TextField } from '@/shared/ui/text-field'
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

// Empty inputs become undefined (not NaN), so Zod's "optional" and our
// superRefine messages take over instead of a generic NaN type error.
function numberValueAs(value: string) {
  return value === '' ? undefined : Number(value)
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
  const paceKg = effectiveWeeklyPaceKg(values, existingGoal)
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
        label={`Starting weight (${unit})`}
        step="0.1"
        error={errors.startWeight?.message}
        {...register('startWeight', { setValueAs: numberValueAs })}
      />

      <NumberInput
        label={`Target weight (${unit})`}
        step="0.1"
        error={errors.targetWeight?.message}
        {...register('targetWeight', { setValueAs: numberValueAs })}
      />

      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-sm font-medium">Pace</legend>
        <div className="flex gap-4">
          <label className="flex items-center gap-1.5 text-sm">
            <input type="radio" value="weeklyLoss" {...register('paceMode')} />{' '}
            Weekly pace
          </label>
          <label className="flex items-center gap-1.5 text-sm">
            <input type="radio" value="targetDate" {...register('paceMode')} />{' '}
            Target date
          </label>
        </div>
      </fieldset>

      {values.paceMode === 'targetDate' ? (
        <TextField
          label="Target date"
          type="date"
          error={errors.targetDate?.message}
          {...register('targetDate')}
        />
      ) : (
        <NumberInput
          label={`Weekly pace (${unit}/week)`}
          step="0.1"
          error={errors.targetWeeklyLoss?.message}
          {...register('targetWeeklyLoss', { setValueAs: numberValueAs })}
        />
      )}

      {dailyDeficit !== null && (
        <p className="text-sm text-muted-foreground">
          Rough estimate: about {Math.round(Math.abs(dailyDeficit))} kcal/day{' '}
          {dailyDeficit >= 0 ? 'deficit' : 'surplus'}. This is a simple
          arithmetic estimate (~7700 kcal ≈ 1kg of fat), not medical or
          nutritional advice.
        </p>
      )}

      <Button type="submit" className="self-start">
        {existingGoal ? 'Update goal' : 'Set goal'}
      </Button>
    </form>
  )
}
