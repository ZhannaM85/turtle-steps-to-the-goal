import { useEffect, useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, Pencil } from 'lucide-react'
import { useForm } from 'react-hook-form'
import type { Goal } from '@/domain/goal'
import { estimatedDailyCalorieDeficitKcal, kgToLb } from '@/domain/goal'
import { suggestDailyTargets } from '@/domain/stats'
import { formatExactNumber, formatNumber, unitLabel, useLocale, useTranslation } from '@/i18n'
import { parseNumberInput } from '@/shared/lib/parseNumberInput'
import { useProfileStore, useUnitStore } from '@/stores'
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
  /** #259 — the most recently logged weight (always kg, unconverted),
   * needed by the "Suggest a target" TDEE helper below. `null` while
   * loading or if nothing's ever been logged, in which case the helper
   * stays disabled. */
  latestWeightKg?: number | null
}

export function GoalForm({
  existingGoal,
  onSubmit,
  activeGoalReached = false,
  latestWeightKg = null,
}: GoalFormProps) {
  const t = useTranslation()
  const locale = useLocale()
  const unit = useUnitStore((state) => state.unit)
  const unitText = unitLabel(unit, t)
  const toDisplay = (kg: number) => (unit === 'lb' ? kgToLb(kg) : kg)
  const schema = useMemo(() => makeGoalFormSchema(t), [t])
  // #259 — profile fields built for #233's BMI/BMR stats, reused here
  // rather than a second profile concept (activityLevel was added
  // specifically for this helper, see profileStore.ts).
  const { heightCm, age, sex, activityLevel } = useProfileStore()

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<GoalFormValues>({
    resolver: zodResolver(schema),
    defaultValues: goalToFormValues(existingGoal, unit),
  })

  const values = watch()
  const paceKg = effectiveWeeklyPaceKg(values, unit)
  const dailyDeficit =
    paceKg !== null ? estimatedDailyCalorieDeficitKcal(paceKg) : null

  // #259 — "Suggest a target": prefills (never auto-saves) the four target
  // fields below from a deterministic TDEE/macro-ratio calculation. Only
  // enabled once every input it needs actually exists; the weekly-pace
  // deficit is optional (falls back to a plain maintenance estimate, 0
  // deficit, if no weekly target has been typed in yet).
  const canSuggestTarget =
    latestWeightKg !== null &&
    heightCm !== undefined &&
    age !== undefined &&
    sex !== undefined &&
    activityLevel !== undefined
  function applySuggestedTargets() {
    if (!canSuggestTarget) return
    const suggested = suggestDailyTargets(
      latestWeightKg,
      heightCm,
      age,
      sex,
      activityLevel,
      dailyDeficit ?? 0,
    )
    setValue('dailyCalorieTarget', suggested.calorieTargetKcal, {
      shouldValidate: true,
    })
    setValue('dailyProteinTarget', suggested.proteinTargetG, {
      shouldValidate: true,
    })
    setValue('dailyFatTarget', suggested.fatTargetG, { shouldValidate: true })
    setValue('dailyCarbTarget', suggested.carbTargetG, {
      shouldValidate: true,
    })
  }

  // #241: the button gave no visible confirmation after a successful save,
  // so a click could look like it did nothing. Brief "Saved" checkmark,
  // auto-clears rather than persisting indefinitely.
  const [justSaved, setJustSaved] = useState(false)

  useEffect(() => {
    if (!justSaved) return
    const timer = setTimeout(() => setJustSaved(false), 2000)
    return () => clearTimeout(timer)
  }, [justSaved])

  // #244: reported live — once #241 made the form clear itself after a
  // save, there was no longer anywhere to see the *current* daily
  // calories/protein targets (the form used to double as that display,
  // pre-filled). Read-only summary + edit pencil now, same
  // display-then-edit shape DailyEntryForm.tsx's Weight/Note fields use.
  // Starts editable only for brand-new setup (no goal yet) — matches
  // those fields' own "nothing saved yet" starting condition.
  const [isEditing, setIsEditing] = useState(existingGoal === null)

  async function submit(formValues: GoalFormValues) {
    await onSubmit(
      formValuesToGoal(formValues, unit, existingGoal, activeGoalReached),
    )
    setJustSaved(true)
    // Explicitly requested, twice: the fields should actually clear once
    // Update is clicked, not just show a confirmation next to them — the
    // current value is visible via the read-only summary (#244) this
    // collapses back to below, not the form itself. Root cause of the
    // first two attempts: react-hook-form's reset() treats `undefined` as
    // "don't touch this uncontrolled field's DOM value," not "clear it" —
    // its own internal state updates to undefined, but the visible input
    // never follows. An explicit empty string is what actually clears the
    // rendered value (confirmed with an isolated repro against a bare
    // native <input>, no custom components involved).
    reset({
      targetWeeklyLoss: '' as unknown as number | undefined,
      dailyCalorieTarget: '' as unknown as number | undefined,
      dailyProteinTarget: '' as unknown as number | undefined,
      dailyFatTarget: '' as unknown as number | undefined,
      dailyCarbTarget: '' as unknown as number | undefined,
    })
    setIsEditing(false)
  }

  if (!isEditing && existingGoal) {
    return (
      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-foreground">
          {t.goal.currentGoalTitle}
        </h2>
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-b border-border">
              <th
                scope="row"
                className="py-2 pr-4 text-left font-normal text-muted-foreground"
              >
                {t.goal.thisWeeksTarget}
              </th>
              <td className="py-2 text-right font-medium text-foreground">
                {t.goal.targetPerWeek(
                  formatNumber(
                    -toDisplay(existingGoal.targetWeeklyLossKg),
                    locale,
                  ),
                  unitText,
                )}
              </td>
            </tr>
            <tr className="border-b border-border">
              <th
                scope="row"
                className="py-2 pr-4 text-left font-normal text-muted-foreground"
              >
                {t.goal.dailyCalorieTargetLabel}
              </th>
              <td className="py-2 text-right font-medium text-foreground">
                {existingGoal.dailyCalorieTargetKcal !== undefined
                  ? `${formatNumber(existingGoal.dailyCalorieTargetKcal, locale, 0)} ${t.dailyEntry.kcalUnit}`
                  : t.goal.notSetLabel}
              </td>
            </tr>
            <tr className="border-b border-border">
              <th
                scope="row"
                className="py-2 pr-4 text-left font-normal text-muted-foreground"
              >
                {t.goal.dailyProteinTargetLabel}
              </th>
              <td className="py-2 text-right font-medium text-foreground">
                {existingGoal.dailyProteinTargetG !== undefined
                  ? `${formatExactNumber(existingGoal.dailyProteinTargetG, locale)} ${t.dailyEntry.gramsUnit}`
                  : t.goal.notSetLabel}
              </td>
            </tr>
            <tr className="border-b border-border">
              <th
                scope="row"
                className="py-2 pr-4 text-left font-normal text-muted-foreground"
              >
                {t.goal.dailyFatTargetLabel}
              </th>
              <td className="py-2 text-right font-medium text-foreground">
                {existingGoal.dailyFatTargetG !== undefined
                  ? `${formatExactNumber(existingGoal.dailyFatTargetG, locale)} ${t.dailyEntry.gramsUnit}`
                  : t.goal.notSetLabel}
              </td>
            </tr>
            <tr>
              <th
                scope="row"
                className="py-2 pr-4 text-left font-normal text-muted-foreground"
              >
                {t.goal.dailyCarbTargetLabel}
              </th>
              <td className="py-2 text-right font-medium text-foreground">
                {existingGoal.dailyCarbTargetG !== undefined
                  ? `${formatExactNumber(existingGoal.dailyCarbTargetG, locale)} ${t.dailyEntry.gramsUnit}`
                  : t.goal.notSetLabel}
              </td>
            </tr>
          </tbody>
        </table>
        <Button
          type="button"
          variant="ghost"
          size="icon-xl"
          aria-label={t.goal.editGoalLabel}
          onClick={() => setIsEditing(true)}
          className="self-start"
        >
          <Pencil aria-hidden="true" />
        </Button>
      </div>
    )
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

      {/* #259 — deterministic TDEE/macro-ratio suggestion, prefills but
       * never auto-saves the four fields below. Disabled until every
       * input it needs exists (a logged weight plus the Settings Profile
       * card's height/age/sex/activity level); the hint explains what's
       * missing rather than just hiding the button, matching the app's
       * "explain, don't just disable" copy elsewhere. */}
      <div className="flex flex-col gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          disabled={!canSuggestTarget}
          onClick={applySuggestedTargets}
        >
          {t.goal.suggestTargetButton}
        </Button>
        <p className="text-sm text-muted-foreground">
          {canSuggestTarget
            ? t.goal.suggestTargetCaveat
            : t.goal.suggestTargetMissingProfileHint}
        </p>
      </div>

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

      {/* #252 — same shape again, independent of the other three. */}
      <NumberInput
        label={t.goal.dailyFatTargetLabel}
        hint={t.goal.dailyFatTargetHint}
        unit={t.dailyEntry.gramsUnit}
        error={errors.dailyFatTarget?.message}
        {...register('dailyFatTarget', { setValueAs: parseNumberInput })}
      />

      <NumberInput
        label={t.goal.dailyCarbTargetLabel}
        hint={t.goal.dailyCarbTargetHint}
        unit={t.dailyEntry.gramsUnit}
        error={errors.dailyCarbTarget?.message}
        {...register('dailyCarbTarget', { setValueAs: parseNumberInput })}
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
