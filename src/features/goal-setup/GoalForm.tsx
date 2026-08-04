import { useEffect, useMemo, useRef, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, Minus, Pencil, Plus } from 'lucide-react'
import { useForm, useWatch, type Resolver } from 'react-hook-form'
import { useBlocker } from 'react-router-dom'
import type { Goal } from '@/domain/goal'
import {
  estimatedDailyCalorieDeficitKcal,
  kgToLb,
  WEEKLY_PACE_SOFT_WARN_KG,
  WEEKLY_PACE_STEP_KG,
} from '@/domain/goal'
import {
  estimateWeeklyLossKgFromCalorieTarget,
  recommendedWaterMlRange,
  suggestDailyTargets,
  suggestedFiberTargetG,
  suggestMacrosForCalorieTarget,
  waterRecommendationMidMl,
  weeklyPaceDisagreesWithCalorieImpliedPace,
} from '@/domain/stats'
import { formatExactNumber, formatNumber, unitLabel, useLocale, useTranslation } from '@/i18n'
import { parseNumberInput } from '@/shared/lib/parseNumberInput'
import {
  useMicronutrientTrackingStore,
  useProfileStore,
  useTrackedFieldsStore,
  useUnitStore,
  type Unit,
} from '@/stores'
import { Button } from '@/shared/ui/button'
import { NumberInput } from '@/shared/ui/number-input'
import {
  effectiveWeeklyPaceKg,
  formValuesToGoal,
  goalToFormValues,
} from './goalFormMapping'
import { makeGoalFormSchema, type GoalFormValues } from './goalFormSchema'

/** Empty display values for RHF NumberInputs (#241 / #534) — `undefined`
 * alone does not clear uncontrolled DOM values after reset. */
function emptyGoalFormValues(): GoalFormValues {
  return {
    targetWeeklyLoss: '' as unknown as number | undefined,
    dailyCalorieTarget: '' as unknown as number | undefined,
    dailyProteinTarget: '' as unknown as number | undefined,
    dailyFatTarget: '' as unknown as number | undefined,
    dailyCarbTarget: '' as unknown as number | undefined,
    dailyFiberTarget: '' as unknown as number | undefined,
    dailySodiumTarget: '' as unknown as number | undefined,
    dailyPotassiumTarget: '' as unknown as number | undefined,
    dailyMagnesiumTarget: '' as unknown as number | undefined,
    dailyWaterTarget: '' as unknown as number | undefined,
  }
}

function formValuesForGoal(goal: Goal | null, unit: Unit): GoalFormValues {
  if (!goal) return emptyGoalFormValues()
  return {
    ...emptyGoalFormValues(),
    ...goalToFormValues(goal, unit),
  }
}

export interface GoalFormProps {
  existingGoal: Goal | null
  onSubmit: (goal: Goal) => void | Promise<void>
  /** #259 — the most recently logged weight (always kg, unconverted),
   * needed by the "Suggest a target" TDEE helper below. `null` while
   * loading or if nothing's ever been logged, in which case the helper
   * stays disabled. */
  latestWeightKg?: number | null
}

type RecalcSource = 'pace' | 'calories'

function hasPositiveFieldValue(raw: unknown): boolean {
  const n = Number(raw)
  return Number.isFinite(n) && n > 0
}

export function GoalForm({
  existingGoal,
  onSubmit,
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
  const micronutrients = useMicronutrientTrackingStore((state) => state.tracked)
  const trackFiber = useTrackedFieldsStore((state) => state.tracked.fiber)

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors, isDirty },
  } = useForm<GoalFormValues>({
    // Cast: schema preprocesses `''` → undefined (#241/#534); that widens
    // Zod input to `unknown`, which `zodResolver` otherwise won't assign to
    // `Resolver<GoalFormValues>`.
    resolver: zodResolver(schema) as Resolver<GoalFormValues>,
    // Prefer `goalToFormValues` ({} when null) over empty-string defaults so
    // untouched optional fields stay `undefined`. Empty strings are only used
    // in `reset(emptyGoalFormValues())` to clear uncontrolled inputs (#241).
    defaultValues: goalToFormValues(existingGoal, unit),
  })

  const values = useWatch({ control })
  const paceKg = effectiveWeeklyPaceKg(values, unit)
  const dailyDeficit =
    paceKg !== null ? estimatedDailyCalorieDeficitKcal(paceKg) : null
  // #529 — display-unit step (~100 g). lb uses the converted 0.1 kg, rounded
  // to 2 decimals so ± doesn't produce ugly floats.
  const weeklyPaceStepDisplay =
    unit === 'lb'
      ? Math.round(kgToLb(WEEKLY_PACE_STEP_KG) * 100) / 100
      : WEEKLY_PACE_STEP_KG
  const showAggressivePaceWarning =
    paceKg !== null && paceKg > WEEKLY_PACE_SOFT_WARN_KG

  // #259 — profile + weight required for suggest/recalculate helpers.
  const canSuggestTarget =
    latestWeightKg !== null &&
    heightCm !== undefined &&
    age !== undefined &&
    sex !== undefined &&
    activityLevel !== undefined

  // #569/#573 — contextual recalculate beside last-edited pace or calories
  // only (protein/fat/carbs anchors removed — inconsistent on-device).
  const [lastEditedRecalcSource, setLastEditedRecalcSource] =
    useState<RecalcSource | null>(null)
  const skipMarkEditedRef = useRef(false)

  function markEdited(source: RecalcSource) {
    if (!skipMarkEditedRef.current) {
      setLastEditedRecalcSource(source)
    }
  }

  function runProgrammaticRecalc(update: () => void) {
    skipMarkEditedRef.current = true
    try {
      update()
    } finally {
      skipMarkEditedRef.current = false
    }
    setLastEditedRecalcSource(null)
  }

  function runProgrammaticPrefill(update: () => void) {
    skipMarkEditedRef.current = true
    try {
      update()
    } finally {
      skipMarkEditedRef.current = false
    }
  }

  function setPaceFromCalories(calorieTargetKcal: number) {
    if (!canSuggestTarget || latestWeightKg === null) return
    const paceKg = estimateWeeklyLossKgFromCalorieTarget(
      latestWeightKg,
      heightCm,
      age,
      sex,
      activityLevel,
      calorieTargetKcal,
    )
    const displayPace = Math.min(
      10,
      Math.max(weeklyPaceStepDisplay, toDisplay(paceKg)),
    )
    setValue('targetWeeklyLoss', Math.round(displayPace * 100) / 100, {
      shouldValidate: true,
      shouldDirty: true,
    })
  }

  function adjustWeeklyPace(direction: 1 | -1) {
    markEdited('pace')
    const raw = Number(values.targetWeeklyLoss)
    const current =
      Number.isFinite(raw) && raw > 0 ? raw : 0
    const next =
      Math.round((current + direction * weeklyPaceStepDisplay) * 100) / 100
    // Schema max is 10 (display unit); floor at one step so − never hits 0.
    const clamped = Math.min(10, Math.max(weeklyPaceStepDisplay, next))
    setValue('targetWeeklyLoss', clamped, {
      shouldDirty: true,
      shouldValidate: true,
    })
  }

  // #259 — "Suggest a target": prefills (never auto-saves) the four target
  // fields below from a deterministic TDEE/macro-ratio calculation. Only
  // enabled once every input it needs actually exists; the weekly-pace
  // deficit is optional (falls back to a plain maintenance estimate, 0
  // deficit, if no weekly target has been typed in yet).
  function fillSuggestedTargetsFromPace() {
    const suggested = suggestDailyTargets(
      latestWeightKg!,
      heightCm!,
      age!,
      sex!,
      activityLevel!,
      dailyDeficit ?? 0,
    )
    setValue('dailyCalorieTarget', suggested.calorieTargetKcal, {
      shouldValidate: true,
      shouldDirty: true,
    })
    setValue('dailyProteinTarget', suggested.proteinTargetG, {
      shouldValidate: true,
      shouldDirty: true,
    })
    setValue('dailyFatTarget', suggested.fatTargetG, {
      shouldValidate: true,
      shouldDirty: true,
    })
    setValue('dailyCarbTarget', suggested.carbTargetG, {
      shouldValidate: true,
      shouldDirty: true,
    })
    setValue('dailyFiberTarget', suggested.fiberTargetG, {
      shouldValidate: true,
      shouldDirty: true,
    })
  }

  function applySuggestedTargets() {
    if (!canSuggestTarget) return
    runProgrammaticRecalc(() => fillSuggestedTargetsFromPace())
  }

  const calorieTargetRaw = Number(values.dailyCalorieTarget)
  const hasCalorieTarget =
    Number.isFinite(calorieTargetRaw) && calorieTargetRaw > 0

  // #574 — when calories imply gain/maintenance while pace says loss (or
  // reverse), don't present the pace-based deficit estimate as if they match.
  const impliedPaceKgFromCalories =
    canSuggestTarget &&
    hasCalorieTarget &&
    latestWeightKg !== null &&
    heightCm !== undefined &&
    age !== undefined &&
    sex !== undefined &&
    activityLevel !== undefined
      ? estimateWeeklyLossKgFromCalorieTarget(
          latestWeightKg,
          heightCm,
          age,
          sex,
          activityLevel,
          calorieTargetRaw,
        )
      : null
  const paceCaloriesDisagree =
    paceKg !== null &&
    impliedPaceKgFromCalories !== null &&
    weeklyPaceDisagreesWithCalorieImpliedPace(
      paceKg,
      impliedPaceKgFromCalories,
    )

  function applyPaceFromCalories() {
    if (!canSuggestTarget || !hasCalorieTarget || latestWeightKg === null) return
    runProgrammaticRecalc(() => {
      setPaceFromCalories(calorieTargetRaw)
      const macros = suggestMacrosForCalorieTarget(
        latestWeightKg,
        calorieTargetRaw,
      )
      setValue('dailyProteinTarget', macros.proteinTargetG, {
        shouldValidate: true,
        shouldDirty: true,
      })
      setValue('dailyFatTarget', macros.fatTargetG, {
        shouldValidate: true,
        shouldDirty: true,
      })
      setValue('dailyCarbTarget', macros.carbTargetG, {
        shouldValidate: true,
        shouldDirty: true,
      })
      if (sex !== undefined) {
        setValue('dailyFiberTarget', suggestedFiberTargetG(sex), {
          shouldValidate: true,
          shouldDirty: true,
        })
      }
    })
  }

  function recalculateButtonLabel(source: RecalcSource): string {
    switch (source) {
      case 'pace':
        return t.goal.recalculateFromPaceButton
      case 'calories':
        return t.goal.recalculateFromCaloriesButton
    }
  }

  function handleRecalculateFromField(source: RecalcSource) {
    switch (source) {
      case 'pace':
        applySuggestedTargets()
        break
      case 'calories':
        applyPaceFromCalories()
        break
    }
  }

  function renderRecalculateFromField(
    source: RecalcSource,
    fieldValue: unknown,
  ) {
    if (
      lastEditedRecalcSource !== source ||
      !canSuggestTarget ||
      !hasPositiveFieldValue(fieldValue)
    ) {
      return null
    }
    return (
      <div className="flex flex-col gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => handleRecalculateFromField(source)}
        >
          {recalculateButtonLabel(source)}
        </Button>
        <p className="text-xs text-muted-foreground">
          {t.goal.recalculateFromFieldCaveat}
        </p>
      </div>
    )
  }

  const targetWeeklyLossRegister = register('targetWeeklyLoss', {
    setValueAs: parseNumberInput,
  })
  const dailyCalorieTargetRegister = register('dailyCalorieTarget', {
    setValueAs: parseNumberInput,
  })

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

  // #386 — reported live: the previous single "Update" button silently
  // decided, from internal reached/live-window state, whether a save
  // edited the current goal in place or quietly started a fresh one —
  // confusing even to an experienced user. Replaced with two always-
  // available, explicit actions (see the collapsed summary view below);
  // this just remembers which one opened the form, so submit knows which
  // `formValuesToGoal` behavior to use without re-deriving it.
  const [startingNew, setStartingNew] = useState(false)

  // #534 — confirm before discarding dirty edits (Cancel or leave route).
  // Derive nav-block UI from `blocker.state` (no setState-in-effect); Cancel
  // still uses local `confirmDiscard`.
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isEditing &&
      isDirty &&
      currentLocation.pathname !== nextLocation.pathname,
  )
  const showDiscardConfirm =
    confirmDiscard || blocker.state === 'blocked'

  function discardEdits() {
    if (existingGoal && !startingNew) {
      reset(formValuesForGoal(existingGoal, unit))
      setIsEditing(false)
    } else if (existingGoal && startingNew) {
      reset(formValuesForGoal(existingGoal, unit))
      setStartingNew(false)
      setIsEditing(false)
    } else {
      reset(emptyGoalFormValues())
    }
    setConfirmDiscard(false)
  }

  function requestCancel() {
    if (isDirty) {
      setConfirmDiscard(true)
      return
    }
    discardEdits()
  }

  function confirmLeaveWithoutSaving() {
    discardEdits()
    if (blocker.state === 'blocked') {
      blocker.proceed()
    }
  }

  function stayOnForm() {
    setConfirmDiscard(false)
    if (blocker.state === 'blocked') {
      blocker.reset()
    }
  }

  async function submit(formValues: GoalFormValues) {
    await onSubmit(formValuesToGoal(formValues, unit, existingGoal, startingNew))
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
    reset(emptyGoalFormValues())
    setIsEditing(false)
    setStartingNew(false)
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
                  formatExactNumber(
                    toDisplay(existingGoal.targetWeeklyLossKg),
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
            <tr className="border-b border-border">
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
            {trackFiber && (
              <tr className="border-b border-border">
                <th
                  scope="row"
                  className="py-2 pr-4 text-left font-normal text-muted-foreground"
                >
                  {t.goal.dailyFiberTargetLabel}
                </th>
                <td className="py-2 text-right font-medium text-foreground">
                  {existingGoal.dailyFiberTargetG !== undefined
                    ? `${formatExactNumber(existingGoal.dailyFiberTargetG, locale)} ${t.dailyEntry.gramsUnit}`
                    : t.goal.notSetLabel}
                </td>
              </tr>
            )}
            {micronutrients.sodium && (
              <tr className="border-b border-border">
                <th
                  scope="row"
                  className="py-2 pr-4 text-left font-normal text-muted-foreground"
                >
                  {t.goal.dailySodiumTargetLabel}
                </th>
                <td className="py-2 text-right font-medium text-foreground">
                  {existingGoal.dailySodiumTargetMg !== undefined
                    ? `${formatExactNumber(existingGoal.dailySodiumTargetMg, locale)} ${t.dailyEntry.mgUnit}`
                    : t.goal.notSetLabel}
                </td>
              </tr>
            )}
            {micronutrients.potassium && (
              <tr className="border-b border-border">
                <th
                  scope="row"
                  className="py-2 pr-4 text-left font-normal text-muted-foreground"
                >
                  {t.goal.dailyPotassiumTargetLabel}
                </th>
                <td className="py-2 text-right font-medium text-foreground">
                  {existingGoal.dailyPotassiumTargetMg !== undefined
                    ? `${formatExactNumber(existingGoal.dailyPotassiumTargetMg, locale)} ${t.dailyEntry.mgUnit}`
                    : t.goal.notSetLabel}
                </td>
              </tr>
            )}
            {micronutrients.magnesium && (
              <tr className="border-b border-border">
                <th
                  scope="row"
                  className="py-2 pr-4 text-left font-normal text-muted-foreground"
                >
                  {t.goal.dailyMagnesiumTargetLabel}
                </th>
                <td className="py-2 text-right font-medium text-foreground">
                  {existingGoal.dailyMagnesiumTargetMg !== undefined
                    ? `${formatExactNumber(existingGoal.dailyMagnesiumTargetMg, locale)} ${t.dailyEntry.mgUnit}`
                    : t.goal.notSetLabel}
                </td>
              </tr>
            )}
            <tr>
              <th
                scope="row"
                className="py-2 pr-4 text-left font-normal text-muted-foreground"
              >
                {t.goal.dailyWaterTargetLabel}
              </th>
              <td className="py-2 text-right font-medium text-foreground">
                {existingGoal.dailyWaterTargetMl !== undefined
                  ? `${formatExactNumber(existingGoal.dailyWaterTargetMl, locale)} ${t.dailyEntry.mlUnit}`
                  : t.goal.notSetLabel}
              </td>
            </tr>
          </tbody>
        </table>
        {/* #386 — two always-available, explicit actions (reported live:
         * the previous single button silently deciding which one it meant,
         * based on internal state, was confusing even to an experienced
         * user) — Edit always touches this same record; "Start a new
         * goal" always creates a fresh one, closing this one out. */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon-xl"
            aria-label={t.goal.editGoalLabel}
            onClick={() => {
              setStartingNew(false)
              reset(formValuesForGoal(existingGoal, unit))
              setIsEditing(true)
            }}
          >
            <Pencil aria-hidden="true" />
          </Button>
          <div className="flex flex-col gap-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setStartingNew(true)
                reset(emptyGoalFormValues())
                setIsEditing(true)
              }}
            >
              {t.goal.startNewGoalButton}
            </Button>
            <p className="text-xs text-muted-foreground">
              {t.goal.startNewGoalHint}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit((values) => submit(values))}
      className="flex flex-col gap-4"
      noValidate
    >
      <div className="flex flex-col gap-1.5">
        <NumberInput
          label={t.goal.targetLabel(unitLabel(unit, t))}
          error={errors.targetWeeklyLoss?.message}
          hint={t.goal.weeklyTargetStepHint(
            formatExactNumber(weeklyPaceStepDisplay, locale),
            unitText,
          )}
          {...targetWeeklyLossRegister}
          onChange={(event) => {
            markEdited('pace')
            void targetWeeklyLossRegister.onChange(event)
          }}
        />
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon-xl"
            className="h-12"
            aria-label={t.goal.decreaseWeeklyTargetLabel}
            onClick={() => adjustWeeklyPace(-1)}
          >
            <Minus aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-xl"
            className="h-12"
            aria-label={t.goal.increaseWeeklyTargetLabel}
            onClick={() => adjustWeeklyPace(1)}
          >
            <Plus aria-hidden="true" />
          </Button>
        </div>
        {renderRecalculateFromField('pace', values.targetWeeklyLoss)}
      </div>

      {dailyDeficit !== null && !paceCaloriesDisagree && (
        <p className="text-sm text-muted-foreground">
          {t.goal.deficitEstimate(
            Math.round(Math.abs(dailyDeficit)),
            dailyDeficit >= 0 ? 'deficit' : 'surplus',
          )}{' '}
          {t.goal.deficitCaveat}
        </p>
      )}

      {paceCaloriesDisagree && (
        <p
          role="status"
          className="rounded-lg border border-amber-600/35 bg-amber-500/15 p-3 text-sm text-foreground"
        >
          {t.goal.paceCaloriesMismatchHint}
        </p>
      )}

      {showAggressivePaceWarning && dailyDeficit !== null && !paceCaloriesDisagree && (
        <p
          role="status"
          className="rounded-lg border border-border bg-muted p-3 text-sm text-foreground"
        >
          {t.goal.aggressivePaceWarning(
            formatNumber(Math.round(Math.abs(dailyDeficit)), locale, 0),
          )}
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
          onClick={() => {
            if (!canSuggestTarget) return
            runProgrammaticPrefill(() => fillSuggestedTargetsFromPace())
          }}
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
        {...dailyCalorieTargetRegister}
        onChange={(event) => {
          markEdited('calories')
          void dailyCalorieTargetRegister.onChange(event)
        }}
      />
      {renderRecalculateFromField('calories', values.dailyCalorieTarget)}

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

      {/* #341 — same shape again, independent of the other four.
       * #582 — Suggest / Recalculate also fill fiber; soft button when
       * profile sex is known (parity with water's soft recommend).
       * #590 — hide when Fiber is off in What to track (same gate as Day). */}
      {trackFiber && (
        <>
          <NumberInput
            label={t.goal.dailyFiberTargetLabel}
            hint={t.goal.dailyFiberTargetHint}
            unit={t.dailyEntry.gramsUnit}
            error={errors.dailyFiberTarget?.message}
            {...register('dailyFiberTarget', { setValueAs: parseNumberInput })}
          />
          {sex !== undefined && (
            <div className="flex flex-col gap-1.5">
              <p className="text-sm text-muted-foreground">
                {t.goal.fiberSuggestionHint(
                  formatExactNumber(suggestedFiberTargetG(sex), locale),
                )}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="self-start"
                onClick={() => {
                  setValue('dailyFiberTarget', suggestedFiberTargetG(sex), {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }}
              >
                {t.goal.useFiberSuggestionButton}
              </Button>
            </div>
          )}
        </>
      )}

      {micronutrients.sodium && (
        <NumberInput
          label={t.goal.dailySodiumTargetLabel}
          hint={t.goal.dailySodiumTargetHint}
          unit={t.dailyEntry.mgUnit}
          error={errors.dailySodiumTarget?.message}
          {...register('dailySodiumTarget', { setValueAs: parseNumberInput })}
        />
      )}
      {micronutrients.potassium && (
        <NumberInput
          label={t.goal.dailyPotassiumTargetLabel}
          hint={t.goal.dailyPotassiumTargetHint}
          unit={t.dailyEntry.mgUnit}
          error={errors.dailyPotassiumTarget?.message}
          {...register('dailyPotassiumTarget', { setValueAs: parseNumberInput })}
        />
      )}
      {micronutrients.magnesium && (
        <NumberInput
          label={t.goal.dailyMagnesiumTargetLabel}
          hint={t.goal.dailyMagnesiumTargetHint}
          unit={t.dailyEntry.mgUnit}
          error={errors.dailyMagnesiumTarget?.message}
          {...register('dailyMagnesiumTarget', { setValueAs: parseNumberInput })}
        />
      )}

      {/* #258 — same shape again, independent of the macro targets.
       * #548 — soft weight-based range + optional fill of mid value. */}
      <NumberInput
        label={t.goal.dailyWaterTargetLabel}
        hint={t.goal.dailyWaterTargetHint}
        unit={t.dailyEntry.mlUnit}
        error={errors.dailyWaterTarget?.message}
        {...register('dailyWaterTarget', { setValueAs: parseNumberInput })}
      />
      {latestWeightKg !== null && latestWeightKg > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-sm text-muted-foreground">
            {(() => {
              const range = recommendedWaterMlRange(latestWeightKg)
              return t.goal.waterRecommendationGoalHint(
                formatExactNumber(range.lowMl / 1000, locale),
                formatExactNumber(range.highMl / 1000, locale),
              )
            })()}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() => {
              const mid = waterRecommendationMidMl(
                recommendedWaterMlRange(latestWeightKg),
              )
              setValue('dailyWaterTarget', mid, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }}
          >
            {t.goal.useWaterRecommendationButton}
          </Button>
        </div>
      )}

      {showDiscardConfirm && (
        <div className="flex flex-col gap-2 rounded-xl bg-card p-3 ring-1 ring-foreground/10">
          <span className="text-sm text-muted-foreground">
            {t.goal.confirmDiscardEditsLabel}
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={confirmLeaveWithoutSaving}
            >
              {t.dailyEntry.confirmDiscardInProgressMealYes}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={stayOnForm}>
              {t.dailyEntry.confirmDiscardInProgressMealNo}
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 self-start">
        <Button type="submit">
          {existingGoal && !startingNew ? t.goal.updateButton : t.goal.setButton}
        </Button>
        <Button type="button" variant="outline" onClick={requestCancel}>
          {t.goal.cancelButton}
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
