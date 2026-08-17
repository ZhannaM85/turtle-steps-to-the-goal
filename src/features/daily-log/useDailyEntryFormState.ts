import { useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import type { DailyEntry, DayTotals, Emotion } from '@/domain/dailyEntry'
import {
  hadNightEating,
  totalCalories,
  totalCarbs,
  totalFat,
  totalProtein,
} from '@/domain/dailyEntry'
import { useLocale, useTranslation, formatNumber } from '@/i18n'
import { usePreviousDayEntry, useEntryFieldComparisonBaselines } from '@/shared/hooks'
import {
  formatKcal,
  formatMacroGrams,
  macrosSummaryTextWithCalories,
} from '@/shared/lib/macroDisplay'
import { parseNumberInput } from '@/shared/lib/parseNumberInput'
import { splitHoursMinutes } from '@/shared/lib/sleepDuration'
import {
  useAlcoholTrackingStore,
  useDigestionTrackingStore,
  useGoalStore,
  useProfileStore,
  useTrackedFieldsStore,
  useWaterTrackingStore,
} from '@/stores'
import { entryToFormValues, formValuesToEntry } from './dailyEntryFormMapping'
import {
  bodyFatPercentSchema,
  bodyWaterPercentSchema,
  boneMassKgSchema,
  dayTotalsSchema,
  deepSleepHoursSchema,
  hipCmSchema,
  muscleMassKgSchema,
  noteSchema,
  sleepHoursSchema,
  stepsSchema,
  visceralFatRatingSchema,
  waistCmSchema,
  waterMlSchema,
  weightSchema,
  type DailyEntryFormValues,
} from './dailyEntryFormSchema'
import {
  isUnusualBodyFatPercentDelta,
  isUnusualBodyWaterPercentDelta,
  isUnusualMuscleMassKg,
  isUnusualVisceralFat,
  isUnusualBodyWaterPercent,
  isUnusualBoneMassKg,
  isUnusualBodyFatPercent,
  isUnusualBoneMassDeltaKg,
  isUnusualMuscleMassDeltaKg,
  isUnusualVisceralFatDelta,
  isUnusualWeightDeltaKg,
  isUnusualWeightKg,
} from './unusualEntryThresholds'

export interface DailyEntryFormProps {
  date: string
  existingEntry: DailyEntry | null
  /** Called every time an individual field or meal is saved — there is no
   * single whole-form submit anymore (#31). May fire many times per
   * session: once per weight save, note save, meal add/edit/delete. */
  onSave: (entry: DailyEntry) => void
  /**
   * Skips the read-only-display-until-pencil-clicked treatment for Weight
   * and Note, rendering them as plain always-editable inputs instead. Used
   * by History's inline edit, where clicking "Edit entry" already is the
   * explicit edit gesture — a second layer of per-field pencils there would
   * just be redundant. Itemized calorie editing is unaffected either way.
   */
  alwaysEditable?: boolean
}

/** Sleep is stored as decimal hours (`sleepHours`/`deepSleepHours`), but
 * entered as separate hours+minutes fields (#69) — typing "7.5" on a mobile
 * numeric keypad was awkward, whole hours + whole minutes is the natural
 * way people think about sleep duration. `splitHoursMinutes` moved to
 * `shared/lib/sleepDuration.ts` (#358) so `TodayScreen.tsx`'s Sleep
 * `StatCard` can reuse the identical conversion for its own read-only
 * display; this combining direction (form input -> decimal) is still only
 * needed here. */
function combineHoursMinutes(
  hoursText: string,
  minutesText: string,
): number | undefined {
  const hours = parseNumberInput(hoursText)
  const minutes = parseNumberInput(minutesText)
  if (hours === undefined && minutes === undefined) return undefined
  return (hours ?? 0) + (minutes ?? 0) / 60
}

/**
 * #416 — every field's state/handler `DailyEntryForm.tsx` used to own
 * directly, extracted into a shared hook so the form can be split across
 * two non-contiguous render points (`DailyEntryFormTop`/`DailyEntryFormBottom`)
 * while both still read/write the *same* live react-hook-form instance —
 * needed so e.g. the Evening group's night-eating toggle sees the same
 * live `calorieEntries` the Meals section in the Top half edits, without
 * waiting for a remount. `DailyEntryForm.tsx` itself (the combined,
 * single-call-site default used by History's `EntryRow.tsx`) just calls
 * this once and renders both halves together, unchanged from before.
 */
export function useDailyEntryFormState({
  date,
  existingEntry,
  onSave,
  alwaysEditable = false,
}: DailyEntryFormProps) {
  const t = useTranslation()
  const locale = useLocale()
  // #401 — the prior calendar day's entry, for a relative sanity check
  // (unusual jump vs. yesterday) alongside #218's absolute-plausibility
  // checks below. `null` when there's no entry for that date (nothing to
  // compare against, so no delta warning is possible).
  const previousDayEntry = usePreviousDayEntry(date)
  // #664 — prior-day / exactly-30-days-ago baselines for live arrows + ⓘ.
  const entryComparisonBaselines = useEntryFieldComparisonBaselines(date)
  // A stable identity for this day's entry, reused across every independent
  // save in this session (weight, note, each meal) so they all update the
  // same record instead of each save inventing a new id. Computed once —
  // existingEntry won't reactively reflect earlier saves made in this same
  // session, since the parent doesn't necessarily re-pass a fresh prop
  // after every one of potentially many saves.
  const entryIdentity = useMemo(
    () => ({
      id: existingEntry?.id ?? crypto.randomUUID(),
      createdAt: existingEntry?.createdAt ?? new Date().toISOString(),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
  const initialValues = useMemo(
    () => entryToFormValues(existingEntry),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
  // Whether Weight/Note render as an editable input rather than read-only
  // display + pencil. Deliberately NOT derived from the live watched value —
  // that would flip to display mode mid-keystroke on every first character
  // typed into a blank field. Starts editable only when there's nothing
  // saved yet; a pencil click re-opens it explicitly, a successful save
  // collapses it back.
  const [isEditingWeight, setIsEditingWeight] = useState(
    alwaysEditable || initialValues.weightKg === undefined,
  )
  // #670 — two-step confirm before deleting a logged weight entry, same
  // shape as MealList's/EntryRow's/PastTargetsList's own inline
  // confirmDelete flows (a muted label + destructive Yes / ghost No),
  // rather than a heavier Dialog-component modal this codebase doesn't
  // otherwise use for delete confirmations.
  const [isConfirmingDeleteWeight, setIsConfirmingDeleteWeight] =
    useState(false)
  // #672 — canCancelWeightEdit/canDeleteWeight below used to derive
  // straight from `initialValues.weightKg`, which is frozen at mount
  // (see initialValues' own comment) and never re-synced after a save made
  // later in this same session. That meant the very first weight save of
  // the day (nothing existed at mount) left Trash hidden until a full page
  // reload re-mounted the component with a fresh `existingEntry` — and,
  // symmetrically, deleting a weight left Trash/Cancel visible even though
  // there was nothing left to act on, reading like the delete hadn't taken
  // effect (#673). Tracked as live state instead, updated by saveWeight/
  // confirmDeleteWeight themselves rather than re-derived from a stale prop.
  const [hasSavedWeight, setHasSavedWeight] = useState(
    initialValues.weightKg !== undefined,
  )
  // #745 — same live "anything saved in this card" flag as weight (#672),
  // so Trash appears after the first save of the day and hides after delete
  // without waiting for a remount.
  const [hasSavedSleep, setHasSavedSleep] = useState(
    initialValues.sleepHours !== undefined ||
      initialValues.deepSleepHours !== undefined,
  )
  const [hasSavedBodyMeasurements, setHasSavedBodyMeasurements] = useState(
    initialValues.waistCm !== undefined || initialValues.hipCm !== undefined,
  )
  const [hasSavedBodyComposition, setHasSavedBodyComposition] = useState(
    initialValues.muscleMassKg !== undefined ||
      initialValues.visceralFatRating !== undefined ||
      initialValues.bodyWaterPercent !== undefined ||
      initialValues.boneMassKg !== undefined ||
      initialValues.bodyFatPercent !== undefined,
  )
  const [isConfirmingDeleteSleep, setIsConfirmingDeleteSleep] = useState(false)
  const [isConfirmingDeleteBodyMeasurements, setIsConfirmingDeleteBodyMeasurements] =
    useState(false)
  const [isConfirmingDeleteBodyComposition, setIsConfirmingDeleteBodyComposition] =
    useState(false)
  // #218: the exact value a Save tap flagged as unusual (not the same as
  // "is the current field value unusual" — a second tap should only skip
  // straight to saving if the value hasn't changed since the warning
  // appeared; editing it after seeing the warning re-checks it fresh
  // rather than silently reusing a stale confirmation).
  const [pendingUnusualWeight, setPendingUnusualWeight] = useState<
    number | null
  >(null)
  // #401 — same "re-check fresh if the value changed" shape as
  // pendingUnusualWeight above, but for the 5 body composition fields at
  // once: a second Save tap only commits straight through if none of them
  // changed since the warning appeared.
  const [pendingUnusualBodyComposition, setPendingUnusualBodyComposition] =
    useState<{
      muscleMassKg?: number
      visceralFatRating?: number
      bodyWaterPercent?: number
      boneMassKg?: number
      bodyFatPercent?: number
    } | null>(null)
  const [isEditingNote, setIsEditingNote] = useState(
    alwaysEditable || !initialValues.note,
  )
  const [isEditingSleep, setIsEditingSleep] = useState(
    alwaysEditable ||
      (initialValues.sleepHours === undefined &&
        initialValues.deepSleepHours === undefined),
  )
  // Hours+minutes sub-fields for sleep entry (#69) — kept as local text
  // state rather than react-hook-form fields, since the form's own
  // sleepHours/deepSleepHours stay decimal; these are combined into that
  // decimal only on save (see combineHoursMinutes).
  const initialSleepParts = splitHoursMinutes(initialValues.sleepHours)
  const initialDeepSleepParts = splitHoursMinutes(initialValues.deepSleepHours)
  const [sleepHoursPart, setSleepHoursPart] = useState(initialSleepParts.hours)
  const [sleepMinutesPart, setSleepMinutesPart] = useState(
    initialSleepParts.minutes,
  )
  const [deepSleepHoursPart, setDeepSleepHoursPart] = useState(
    initialDeepSleepParts.hours,
  )
  const [deepSleepMinutesPart, setDeepSleepMinutesPart] = useState(
    initialDeepSleepParts.minutes,
  )
  const [isEditingSteps, setIsEditingSteps] = useState(
    alwaysEditable || initialValues.steps === undefined,
  )
  // Body measurements (#225) — waist/hip/body fat bundled under one edit
  // toggle, same "combine related optional numbers into one section"
  // pattern Sleep already uses for hours+deep hours above.
  const [isEditingBodyMeasurements, setIsEditingBodyMeasurements] = useState(
    alwaysEditable ||
      (initialValues.waistCm === undefined &&
        initialValues.hipCm === undefined),
  )
  // Body composition (#233) — muscle mass/visceral fat/body water/bone
  // mass bundled under one edit toggle, same pattern as Body measurements
  // above (a distinct group since these come from a smart scale rather
  // than a tape measure/caliper). #263: body fat % moved here from Body
  // measurements — for a bioimpedance scale it's read in the same sync as
  // these four, not from a tape measure/caliper like waist/hip.
  const [isEditingBodyComposition, setIsEditingBodyComposition] = useState(
    alwaysEditable ||
      (initialValues.muscleMassKg === undefined &&
        initialValues.visceralFatRating === undefined &&
        initialValues.bodyWaterPercent === undefined &&
        initialValues.boneMassKg === undefined &&
        initialValues.bodyFatPercent === undefined),
  )
  // #549 — day-level totals (kcal + optional macros), separate from meals.
  const [isEditingDayTotals, setIsEditingDayTotals] = useState(
    alwaysEditable || initialValues.dayTotals === undefined,
  )
  const [dayTotalsKcalInput, setDayTotalsKcalInput] = useState('')
  const [dayTotalsProteinInput, setDayTotalsProteinInput] = useState('')
  const [dayTotalsFatInput, setDayTotalsFatInput] = useState('')
  const [dayTotalsCarbsInput, setDayTotalsCarbsInput] = useState('')
  const [dayTotalsFiberInput, setDayTotalsFiberInput] = useState('')
  const [dayTotalsError, setDayTotalsError] = useState<string | null>(null)

  // Opt-in digestion tracking's on/off toggle (Settings) — the toggle
  // itself only renders on this screen when enabled, same gate DayDetail
  // already uses for its own copy of this control.
  const digestionTrackingEnabled = useDigestionTrackingStore(
    (state) => state.enabled,
  )
  // Opt-in alcohol day signal (#607) — same gate as digestion tracking above.
  const alcoholTrackingEnabled = useAlcoholTrackingStore(
    (state) => state.enabled,
  )
  // Opt-in water tracking's on/off toggle (#258) — same gate as digestion
  // tracking above.
  const waterTrackingEnabled = useWaterTrackingStore((state) => state.enabled)
  // #237 — which optional fields appear on this form at all, unified in
  // one Settings section.
  const trackedFields = useTrackedFieldsStore((state) => state.tracked)
  // #398 — grammatically-correct verb form for the night-eating label below.
  const sex = useProfileStore((state) => state.sex)
  // #399 — passed to MealList's add-food flows for a "remaining calories"
  // preview; already loaded by this screen's own parent (TodayScreen) or,
  // for EntryRow's alwaysEditable mode, by HistoryScreen's useHistoryData.
  const dailyCalorieTargetKcal = useGoalStore(
    (state) => state.goal?.dailyCalorieTargetKcal,
  )
  // #462 — read alongside dailyCalorieTargetKcal above, to compute the
  // "remaining macros" row below (dayRemainingMacrosSummary). Each is
  // independently optional, same as the calorie target.
  const dailyProteinTargetG = useGoalStore(
    (state) => state.goal?.dailyProteinTargetG,
  )
  const dailyFatTargetG = useGoalStore((state) => state.goal?.dailyFatTargetG)
  const dailyCarbTargetG = useGoalStore(
    (state) => state.goal?.dailyCarbTargetG,
  )

  const {
    register,
    getValues,
    setValue,
    reset,
    control,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<DailyEntryFormValues>({
    defaultValues: initialValues,
  })

  const weightKg = useWatch({ control, name: 'weightKg' })
  const note = useWatch({ control, name: 'note' })
  const sleepHours = useWatch({ control, name: 'sleepHours' })
  const deepSleepHours = useWatch({ control, name: 'deepSleepHours' })
  const steps = useWatch({ control, name: 'steps' })
  const waistCm = useWatch({ control, name: 'waistCm' })
  const hipCm = useWatch({ control, name: 'hipCm' })
  const bodyFatPercent = useWatch({ control, name: 'bodyFatPercent' })
  const muscleMassKg = useWatch({ control, name: 'muscleMassKg' })
  const visceralFatRating = useWatch({ control, name: 'visceralFatRating' })
  const bodyWaterPercent = useWatch({ control, name: 'bodyWaterPercent' })
  const boneMassKg = useWatch({ control, name: 'boneMassKg' })
  const hadConstipation = useWatch({ control, name: 'hadConstipation' })
  const hadAlcohol = useWatch({ control, name: 'hadAlcohol' })
  const nightEatingOverride = useWatch({
    control,
    name: 'nightEatingOverride',
  })
  const waterEntries = useWatch({ control, name: 'waterEntries' }) ?? []
  const dayTotals = useWatch({ control, name: 'dayTotals' })
  const dayEmotion = useWatch({ control, name: 'emotion' })
  const calorieEntries = useWatch({ control, name: 'calorieEntries' }) ?? []
  // #383 — the toggle always shows the *effective* value (override, or
  // else derived from today's own logged meal times), so it reflects
  // reality even before the user has ever touched it themselves.
  const nightEatingEffective = hadNightEating({
    calorieEntries,
    nightEatingOverride,
  })
  const dayTotalCalories = totalCalories(calorieEntries, dayTotals) ?? 0
  // #462 — consumed macros pulled out to standalone variables so the
  // "remaining" computation below can reuse them, rather than calling
  // totalProtein/totalFat/totalCarbs a second time.
  const consumedProteinG = totalProtein(calorieEntries, dayTotals)
  const consumedFatG = totalFat(calorieEntries, dayTotals)
  const consumedCarbG = totalCarbs(calorieEntries, dayTotals)
  const dayMacrosSummary = macrosSummaryTextWithCalories(
    // Undefined-preserving (not dayTotalCalories's `?? 0` above) — matches
    // the three macros' own "dash when unlogged" treatment, and keeps this
    // row hidden entirely on a day with nothing logged at all, same as
    // before #462 added calories in here.
    totalCalories(calorieEntries, dayTotals),
    consumedProteinG,
    consumedFatG,
    consumedCarbG,
    locale,
    t,
  )
  // #462 — "remaining" counterpart to dayMacrosSummary above: each daily
  // target minus what's been consumed so far, same unclamped shape
  // TodayScreen's own remaining-nutrient cards already use (#266/#321) —
  // an overage just reads as a negative number here rather than a
  // "0g remaining" floor. Undefined (not shown, dash) when that particular
  // target isn't set; the whole row hides when none of the four are.
  const remainingKcal =
    dailyCalorieTargetKcal !== undefined
      ? dailyCalorieTargetKcal - dayTotalCalories
      : undefined
  const remainingProteinG =
    dailyProteinTargetG !== undefined
      ? dailyProteinTargetG - (consumedProteinG ?? 0)
      : undefined
  const remainingFatG =
    dailyFatTargetG !== undefined
      ? dailyFatTargetG - (consumedFatG ?? 0)
      : undefined
  const remainingCarbG =
    dailyCarbTargetG !== undefined
      ? dailyCarbTargetG - (consumedCarbG ?? 0)
      : undefined
  const dayRemainingMacrosSummary = macrosSummaryTextWithCalories(
    remainingKcal,
    remainingProteinG,
    remainingFatG,
    remainingCarbG,
    locale,
    t,
  )
  // #467 — StatCard-shaped counterparts to the two combined strings above:
  // kcal as the card's own big value, this as its description (protein/fat/
  // carbs only, no kcal prefix since the card already shows it as the
  // number). Built directly rather than via macrosSummaryText — that
  // helper returns null when all 3 macros are unset, which is right for
  // its other callers (no card renders at all then) but wrong here: the
  // card itself is already gated on dayMacrosSummary/dayRemainingMacrosSummary
  // (true once *any* of kcal+3 macros is set), so a macros-only null would
  // silently drop the description on a day with just calories logged.
  const dayMacrosDescription = t.dailyEntry.macrosSummary(
    formatMacroGrams(consumedProteinG, locale, t),
    formatMacroGrams(consumedFatG, locale, t),
    formatMacroGrams(consumedCarbG, locale, t),
  )
  // #521 — Remaining card's big number alone doesn't answer "left from
  // how many?"; prepend the same target − consumed line TodayScreen's
  // Stats remaining-calories card already shows (`targetMinusConsumedText`).
  // Macros stay on a second line (StatCard description uses
  // whitespace-pre-line). Omitted when no daily calorie target is set.
  const remainingMacrosLine = t.dailyEntry.macrosSummary(
    formatMacroGrams(remainingProteinG, locale, t),
    formatMacroGrams(remainingFatG, locale, t),
    formatMacroGrams(remainingCarbG, locale, t),
  )
  const dayRemainingMacrosDescription =
    dailyCalorieTargetKcal !== undefined
      ? [
          t.today.targetMinusConsumedText(
            formatKcal(dailyCalorieTargetKcal, locale, t),
            formatKcal(dayTotalCalories, locale, t),
          ),
          remainingMacrosLine,
        ].join('\n')
      : remainingMacrosLine
  // #549 — one-line saved summary for the day totals section display mode.
  const dayTotalsSavedSummary =
    dayTotals !== undefined
      ? [
          macrosSummaryTextWithCalories(
            dayTotals.amountKcal,
            dayTotals.proteinG,
            dayTotals.fatG,
            dayTotals.carbsG,
            locale,
            t,
          ),
          dayTotals.fiberG !== undefined
            ? `${t.dailyEntry.fiberLabel}: ${formatNumber(dayTotals.fiberG, locale, 0)} ${t.dailyEntry.gramsUnit}`
            : null,
        ]
          .filter(Boolean)
          .join(' · ')
      : null

  const showWeightAsDisplay = !alwaysEditable && !isEditingWeight
  const showNoteAsDisplay = !alwaysEditable && !isEditingNote
  const showSleepAsDisplay = !alwaysEditable && !isEditingSleep
  const showStepsAsDisplay = !alwaysEditable && !isEditingSteps
  const showBodyMeasurementsAsDisplay =
    !alwaysEditable && !isEditingBodyMeasurements
  const showBodyCompositionAsDisplay =
    !alwaysEditable && !isEditingBodyComposition

  // #424 — whether there's an established value to actually cancel back
  // to. A field that's still empty (nothing ever saved) auto-opens in edit
  // mode with no display-mode rendering to return to (its own display JSX
  // assumes a real value); offering Cancel there would flip to display mode
  // with nothing to show. Mirrors the exact same "any field in the group
  // already has a value" condition each field's own isEditingX initial
  // state above already uses (negated) — `alwaysEditable` itself always
  // permits it, since that context never reaches the display-mode branch
  // and cancel there just clears the input back to blank, safely.
  const canCancelWeightEdit = alwaysEditable || hasSavedWeight
  // #670 — unlike canCancelWeightEdit above, NOT widened by alwaysEditable:
  // there has to be an actual saved value to delete, regardless of which
  // edit affordance (pencil-toggle vs. always-editable input) is showing it.
  const canDeleteWeight = hasSavedWeight
  const canCancelNoteEdit = alwaysEditable || Boolean(initialValues.note)
  const canCancelSleepEdit = alwaysEditable || hasSavedSleep
  const canDeleteSleep = hasSavedSleep
  const canCancelStepsEdit = alwaysEditable || initialValues.steps !== undefined
  const canCancelBodyMeasurementsEdit =
    alwaysEditable || hasSavedBodyMeasurements
  const canDeleteBodyMeasurements = hasSavedBodyMeasurements
  const canCancelBodyCompositionEdit =
    alwaysEditable || hasSavedBodyComposition
  const canDeleteBodyComposition = hasSavedBodyComposition

  // #237: Mood is a standalone, always-interactive field (no separate
  // edit/display toggle the way Sleep/Steps/Note have — EmotionPicker is
  // already a compact, single-tap control) — saves immediately on pick,
  // same as MealList's own per-item reaction picker.
  function saveMood(emotion: Emotion | undefined) {
    setValue('emotion', emotion, { shouldDirty: true })
    persist(getValues())
  }

  // #447 — every save handler calls `persist(getValues())`, which writes
  // *every* registered field at once, not just the one the user actually
  // clicked Save on. Reported live: typing far-out-of-range values into
  // all 5 Body composition fields (which only validate inside
  // `saveBodyComposition()` itself, and #435's on-blur check) got
  // persisted anyway despite Body composition's own Save button never
  // being successfully clicked — because saving a *different* field
  // (Weight/Sleep/Steps/Note/etc.) calls `persist(getValues())` too, and
  // `getValues()` includes whatever garbage is still sitting, unvalidated,
  // in every other field's input at that moment. Fixed by sanitizing here,
  // the one shared choke point every save handler already goes through:
  // any schema-backed field that currently fails its own validation falls
  // back to `initialValues` (the last value this render session actually
  // started with) instead of being written through as-is. This doesn't
  // change the intentional behavior of the field actually being saved —
  // that field's own handler already validated it before ever calling
  // persist() — it only stops *other* fields' in-progress, never-saved
  // drafts from silently riding along.
  function sanitizeForPersist(
    values: DailyEntryFormValues,
  ): DailyEntryFormValues {
    return {
      ...values,
      weightKg: weightSchema.safeParse(values.weightKg).success
        ? values.weightKg
        : initialValues.weightKg,
      note: noteSchema.safeParse(values.note).success
        ? values.note
        : initialValues.note,
      sleepHours: sleepHoursSchema.safeParse(values.sleepHours).success
        ? values.sleepHours
        : initialValues.sleepHours,
      deepSleepHours: deepSleepHoursSchema.safeParse(values.deepSleepHours)
        .success
        ? values.deepSleepHours
        : initialValues.deepSleepHours,
      steps: stepsSchema.safeParse(values.steps).success
        ? values.steps
        : initialValues.steps,
      waistCm: waistCmSchema.safeParse(values.waistCm).success
        ? values.waistCm
        : initialValues.waistCm,
      hipCm: hipCmSchema.safeParse(values.hipCm).success
        ? values.hipCm
        : initialValues.hipCm,
      muscleMassKg: muscleMassKgSchema.safeParse(values.muscleMassKg).success
        ? values.muscleMassKg
        : initialValues.muscleMassKg,
      visceralFatRating: visceralFatRatingSchema.safeParse(
        values.visceralFatRating,
      ).success
        ? values.visceralFatRating
        : initialValues.visceralFatRating,
      bodyWaterPercent: bodyWaterPercentSchema.safeParse(
        values.bodyWaterPercent,
      ).success
        ? values.bodyWaterPercent
        : initialValues.bodyWaterPercent,
      boneMassKg: boneMassKgSchema.safeParse(values.boneMassKg).success
        ? values.boneMassKg
        : initialValues.boneMassKg,
      bodyFatPercent: bodyFatPercentSchema.safeParse(values.bodyFatPercent)
        .success
        ? values.bodyFatPercent
        : initialValues.bodyFatPercent,
    }
  }

  function persist(values: DailyEntryFormValues) {
    onSave(formValuesToEntry(sanitizeForPersist(values), date, entryIdentity))
  }

  // Saves immediately on tap, same as every other independent field here
  // (#31) — no separate confirm step, since a toggle whose own state
  // already shows what's about to happen doesn't need one.
  function setHadConstipation(value: boolean) {
    setValue('hadConstipation', value, { shouldDirty: true })
    persist({ ...getValues(), hadConstipation: value })
  }

  // #607 — same "saves immediately, no confirm step" reasoning as
  // setHadConstipation above.
  function setHadAlcohol(value: boolean) {
    setValue('hadAlcohol', value, { shouldDirty: true })
    persist({ ...getValues(), hadAlcohol: value })
  }

  // #383 — sets an explicit override once touched, same "saves
  // immediately, no confirm step" reasoning as setHadConstipation above.
  // The toggle's own displayed value (see nightEatingEffective below)
  // shows the *derived* value until the user actually overrides it.
  // #406 — `undefined` clears the override back to "no override, use the
  // derived value" — tapping the already-active option deselects it
  // (see the ToggleGroup's onValueChange below), rather than leaving no
  // way back to the untracked/derived state once tapped.
  function setNightEatingOverride(value: boolean | undefined) {
    setValue('nightEatingOverride', value, { shouldDirty: true })
    persist({ ...getValues(), nightEatingOverride: value })
  }

  // #271: each quick-add tap becomes its own removable entry instead of
  // bumping a single running total. #598: freeform ml input removed — only
  // glass/bottle quick-add amounts call this.
  function addWaterEntry(amountMl: number) {
    const result = waterMlSchema.safeParse(amountMl)
    if (!result.success) return
    if (result.data === 0) return
    const entries = [
      ...(getValues('waterEntries') ?? []),
      { id: crypto.randomUUID(), amountMl: result.data },
    ]
    setValue('waterEntries', entries, { shouldDirty: true })
    persist({ ...getValues(), waterEntries: entries })
  }

  function removeWaterEntry(id: string) {
    const entries = (getValues('waterEntries') ?? []).filter(
      (entry) => entry.id !== id,
    )
    setValue('waterEntries', entries, { shouldDirty: true })
    persist({ ...getValues(), waterEntries: entries })
  }

  function startEditDayTotals() {
    setDayTotalsKcalInput(
      dayTotals?.amountKcal !== undefined ? String(dayTotals.amountKcal) : '',
    )
    setDayTotalsProteinInput(
      dayTotals?.proteinG !== undefined ? String(dayTotals.proteinG) : '',
    )
    setDayTotalsFatInput(
      dayTotals?.fatG !== undefined ? String(dayTotals.fatG) : '',
    )
    setDayTotalsCarbsInput(
      dayTotals?.carbsG !== undefined ? String(dayTotals.carbsG) : '',
    )
    setDayTotalsFiberInput(
      dayTotals?.fiberG !== undefined ? String(dayTotals.fiberG) : '',
    )
    setDayTotalsError(null)
    setIsEditingDayTotals(true)
  }

  function saveDayTotals() {
    const amountKcal = parseNumberInput(dayTotalsKcalInput)
    if (amountKcal === undefined) {
      setDayTotalsError(t.dailyEntry.invalidValueMessage)
      return
    }
    const next: DayTotals = { amountKcal }
    const proteinG = parseNumberInput(dayTotalsProteinInput)
    const fatG = parseNumberInput(dayTotalsFatInput)
    const carbsG = parseNumberInput(dayTotalsCarbsInput)
    const fiberG = parseNumberInput(dayTotalsFiberInput)
    if (proteinG !== undefined) next.proteinG = proteinG
    if (fatG !== undefined) next.fatG = fatG
    if (carbsG !== undefined) next.carbsG = carbsG
    if (fiberG !== undefined) next.fiberG = fiberG
    const result = dayTotalsSchema.safeParse(next)
    if (!result.success) {
      setDayTotalsError(t.dailyEntry.invalidValueMessage)
      return
    }
    setDayTotalsError(null)
    setValue('dayTotals', result.data, { shouldDirty: true })
    persist({ ...getValues(), dayTotals: result.data })
    setIsEditingDayTotals(false)
  }

  function clearDayTotals() {
    setValue('dayTotals', undefined, { shouldDirty: true })
    persist({ ...getValues(), dayTotals: undefined })
    setDayTotalsKcalInput('')
    setDayTotalsProteinInput('')
    setDayTotalsFatInput('')
    setDayTotalsCarbsInput('')
    setDayTotalsFiberInput('')
    setDayTotalsError(null)
    setIsEditingDayTotals(true)
  }

  function saveWeight() {
    const result = weightSchema.safeParse(getValues('weightKg'))
    // #669 — weightSchema allows `undefined` (a day can go untracked), but an
    // empty *Save* tap on the weight field specifically isn't a valid way to
    // clear it: it used to fall through to `persist()` and flip the field to
    // its read-only display, which then rendered `formatExactNumber(undefined)`
    // (Intl formats that as literal "NaN"/"не число") instead of being blocked.
    if (!result.success || result.data === undefined) {
      setError('weightKg', { message: t.dailyEntry.invalidValueMessage })
      setPendingUnusualWeight(null)
      return
    }
    clearErrors('weightKg')
    // #401 — a value can pass the absolute plausibility band above while
    // still being an unusual jump from yesterday's own logged weight.
    const isUnusual =
      isUnusualWeightKg(result.data) ||
      (previousDayEntry?.weightKg !== undefined &&
        isUnusualWeightDeltaKg(result.data, previousDayEntry.weightKg))
    if (isUnusual && pendingUnusualWeight !== result.data) {
      setPendingUnusualWeight(result.data)
      return
    }
    setPendingUnusualWeight(null)
    setIsEditingWeight(false)
    setHasSavedWeight(true)
    persist(getValues())
  }

  function discardUnusualWeightWarning() {
    setPendingUnusualWeight(null)
  }

  // #424 — reverts to the value from when this render's edit session
  // started, same "leave without saving" affordance MealList.tsx's #169
  // Cancel button already established, applied here. `initialValues` is
  // memoized once on mount (see its own comment above) — reverting mid-
  // session after an earlier save-then-reopen-then-cancel in the same
  // mount would revert further back than just that reopen, a known,
  // accepted limitation shared with every other use of `initialValues`
  // in this hook.
  function cancelEditWeight() {
    setValue('weightKg', initialValues.weightKg)
    clearErrors('weightKg')
    setPendingUnusualWeight(null)
    setIsEditingWeight(false)
  }

  function requestDeleteWeight() {
    setIsConfirmingDeleteWeight(true)
  }

  function cancelDeleteWeight() {
    setIsConfirmingDeleteWeight(false)
  }

  // #670 — clears the persisted weight entirely (not just the input), then
  // reopens edit mode (empty input) rather than leaving showWeightAsDisplay
  // on with no value — that combination is exactly the #669 NaN bug this
  // would otherwise reintroduce. Uses `reset()`, not `setValue()`: the
  // weight Input unmounts in display/confirm mode, and a plain `setValue`
  // on an unmounted `register()`-bound field doesn't survive the field
  // remounting back into edit mode below — the uncontrolled input falls
  // back to its original `useForm({ defaultValues })` value (confirmed with
  // an isolated repro) instead of showing empty. `reset()` re-baselines
  // `defaultValues` itself, which the remounted input's ref sync reads from.
  function confirmDeleteWeight() {
    const next = { ...getValues(), weightKg: undefined }
    reset(next)
    persist(next)
    setIsConfirmingDeleteWeight(false)
    setPendingUnusualWeight(null)
    setIsEditingWeight(true)
    // #672/#673 — without this, canDeleteWeight/canCancelWeightEdit stayed
    // stuck true (derived from the mount-frozen initialValues), so the
    // reopened edit-mode input kept showing a live Trash button and a
    // Cancel that would revert straight back to the just-deleted value —
    // reading as "delete didn't actually do anything."
    setHasSavedWeight(false)
  }

  function saveNote() {
    const result = noteSchema.safeParse(getValues('note'))
    if (!result.success) {
      setError('note', { message: t.dailyEntry.invalidValueMessage })
      return
    }
    clearErrors('note')
    setIsEditingNote(false)
    persist(getValues())
  }

  // #437 — same #424 Cancel-without-saving affordance, extended to the day
  // note (the two other fields, weight/sleep/etc., already got this).
  function cancelEditNote() {
    setValue('note', initialValues.note)
    clearErrors('note')
    setIsEditingNote(false)
  }

  function saveSleep() {
    const sleepHoursValue = combineHoursMinutes(
      sleepHoursPart,
      sleepMinutesPart,
    )
    const deepSleepHoursValue = combineHoursMinutes(
      deepSleepHoursPart,
      deepSleepMinutesPart,
    )
    const hoursResult = sleepHoursSchema.safeParse(sleepHoursValue)
    const deepHoursResult = deepSleepHoursSchema.safeParse(deepSleepHoursValue)
    if (!hoursResult.success) {
      setError('sleepHours', { message: t.dailyEntry.invalidValueMessage })
      return
    }
    if (!deepHoursResult.success) {
      setError('deepSleepHours', {
        message: t.dailyEntry.invalidValueMessage,
      })
      return
    }
    clearErrors('sleepHours')
    clearErrors('deepSleepHours')
    setValue('sleepHours', sleepHoursValue, { shouldDirty: true })
    setValue('deepSleepHours', deepSleepHoursValue, { shouldDirty: true })
    setIsEditingSleep(false)
    persist({
      ...getValues(),
      sleepHours: sleepHoursValue,
      deepSleepHours: deepSleepHoursValue,
    })
    setHasSavedSleep(
      sleepHoursValue !== undefined || deepSleepHoursValue !== undefined,
    )
  }

  /** #748 — fill parsed AutoSleep screenshot values, then the usual save path. */
  function applySleepPatch(patch: {
    sleepHours?: number
    deepSleepHours?: number
  }) {
    const sleepHoursValue = patch.sleepHours ?? getValues().sleepHours
    const deepSleepHoursValue =
      patch.deepSleepHours ?? getValues().deepSleepHours
    const hoursResult = sleepHoursSchema.safeParse(sleepHoursValue)
    const deepHoursResult = deepSleepHoursSchema.safeParse(deepSleepHoursValue)
    if (!hoursResult.success || !deepHoursResult.success) return
    const sleepParts = splitHoursMinutes(sleepHoursValue)
    const deepParts = splitHoursMinutes(deepSleepHoursValue)
    setSleepHoursPart(sleepParts.hours)
    setSleepMinutesPart(sleepParts.minutes)
    setDeepSleepHoursPart(deepParts.hours)
    setDeepSleepMinutesPart(deepParts.minutes)
    clearErrors('sleepHours')
    clearErrors('deepSleepHours')
    setValue('sleepHours', sleepHoursValue, { shouldDirty: true })
    setValue('deepSleepHours', deepSleepHoursValue, { shouldDirty: true })
    setIsEditingSleep(false)
    persist({
      ...getValues(),
      sleepHours: sleepHoursValue,
      deepSleepHours: deepSleepHoursValue,
    })
    setHasSavedSleep(
      sleepHoursValue !== undefined || deepSleepHoursValue !== undefined,
    )
  }

  // #424 — same "revert to session-start value" shape as cancelEditWeight
  // above, plus resetting the hours/minutes sub-fields local state (not
  // react-hook-form fields, see combineHoursMinutes' own comment) back to
  // the initial split.
  function cancelEditSleep() {
    setValue('sleepHours', initialValues.sleepHours)
    setValue('deepSleepHours', initialValues.deepSleepHours)
    setSleepHoursPart(initialSleepParts.hours)
    setSleepMinutesPart(initialSleepParts.minutes)
    setDeepSleepHoursPart(initialDeepSleepParts.hours)
    setDeepSleepMinutesPart(initialDeepSleepParts.minutes)
    clearErrors('sleepHours')
    clearErrors('deepSleepHours')
    setIsEditingSleep(false)
  }

  function requestDeleteSleep() {
    setIsConfirmingDeleteSleep(true)
  }

  function cancelDeleteSleep() {
    setIsConfirmingDeleteSleep(false)
  }

  // #745 — same reset+persist+reopen-edit shape as confirmDeleteWeight.
  function confirmDeleteSleep() {
    const next = {
      ...getValues(),
      sleepHours: undefined,
      deepSleepHours: undefined,
    }
    reset(next)
    persist(next)
    setSleepHoursPart('')
    setSleepMinutesPart('')
    setDeepSleepHoursPart('')
    setDeepSleepMinutesPart('')
    setIsConfirmingDeleteSleep(false)
    clearErrors('sleepHours')
    clearErrors('deepSleepHours')
    setIsEditingSleep(true)
    setHasSavedSleep(false)
  }

  function saveSteps() {
    const result = stepsSchema.safeParse(getValues('steps'))
    if (!result.success) {
      setError('steps', { message: t.dailyEntry.invalidValueMessage })
      return
    }
    clearErrors('steps')
    setIsEditingSteps(false)
    persist(getValues())
  }

  // #424
  function cancelEditSteps() {
    setValue('steps', initialValues.steps)
    clearErrors('steps')
    setIsEditingSteps(false)
  }

  function saveBodyMeasurements() {
    const waistResult = waistCmSchema.safeParse(getValues('waistCm'))
    const hipResult = hipCmSchema.safeParse(getValues('hipCm'))
    if (!waistResult.success) {
      setError('waistCm', { message: t.dailyEntry.invalidValueMessage })
      return
    }
    if (!hipResult.success) {
      setError('hipCm', { message: t.dailyEntry.invalidValueMessage })
      return
    }
    clearErrors('waistCm')
    clearErrors('hipCm')
    setIsEditingBodyMeasurements(false)
    persist(getValues())
    setHasSavedBodyMeasurements(
      waistResult.data !== undefined || hipResult.data !== undefined,
    )
  }

  // #424
  function cancelEditBodyMeasurements() {
    setValue('waistCm', initialValues.waistCm)
    setValue('hipCm', initialValues.hipCm)
    clearErrors('waistCm')
    clearErrors('hipCm')
    setIsEditingBodyMeasurements(false)
  }

  function requestDeleteBodyMeasurements() {
    setIsConfirmingDeleteBodyMeasurements(true)
  }

  function cancelDeleteBodyMeasurements() {
    setIsConfirmingDeleteBodyMeasurements(false)
  }

  function confirmDeleteBodyMeasurements() {
    const next = { ...getValues(), waistCm: undefined, hipCm: undefined }
    reset(next)
    persist(next)
    setIsConfirmingDeleteBodyMeasurements(false)
    clearErrors('waistCm')
    clearErrors('hipCm')
    setIsEditingBodyMeasurements(true)
    setHasSavedBodyMeasurements(false)
  }

  function saveBodyComposition() {
    const muscleResult = muscleMassKgSchema.safeParse(
      getValues('muscleMassKg'),
    )
    const visceralResult = visceralFatRatingSchema.safeParse(
      getValues('visceralFatRating'),
    )
    const waterResult = bodyWaterPercentSchema.safeParse(
      getValues('bodyWaterPercent'),
    )
    const boneResult = boneMassKgSchema.safeParse(getValues('boneMassKg'))
    const bodyFatResult = bodyFatPercentSchema.safeParse(
      getValues('bodyFatPercent'),
    )
    if (!muscleResult.success) {
      setError('muscleMassKg', {
        message: t.dailyEntry.invalidValueMessage,
      })
      return
    }
    if (!visceralResult.success) {
      setError('visceralFatRating', {
        message: t.dailyEntry.invalidValueMessage,
      })
      return
    }
    if (!waterResult.success) {
      setError('bodyWaterPercent', {
        message: t.dailyEntry.invalidValueMessage,
      })
      return
    }
    if (!boneResult.success) {
      setError('boneMassKg', { message: t.dailyEntry.invalidValueMessage })
      return
    }
    if (!bodyFatResult.success) {
      setError('bodyFatPercent', {
        message: t.dailyEntry.invalidValueMessage,
      })
      return
    }
    clearErrors('muscleMassKg')
    clearErrors('visceralFatRating')
    clearErrors('bodyWaterPercent')
    clearErrors('boneMassKg')
    clearErrors('bodyFatPercent')
    // #401 — each field's own unusual-jump-vs-yesterday check, same
    // relative-delta reasoning as saveWeight() above; only ever compares
    // against a previous value that's actually defined.
    const current = {
      muscleMassKg: muscleResult.data,
      visceralFatRating: visceralResult.data,
      bodyWaterPercent: waterResult.data,
      boneMassKg: boneResult.data,
      bodyFatPercent: bodyFatResult.data,
    }
    const isUnusual =
      (current.muscleMassKg !== undefined &&
        (isUnusualMuscleMassKg(current.muscleMassKg) ||
          (previousDayEntry?.muscleMassKg !== undefined &&
            isUnusualMuscleMassDeltaKg(
              current.muscleMassKg,
              previousDayEntry.muscleMassKg,
            )))) ||
      (current.visceralFatRating !== undefined &&
        (isUnusualVisceralFat(current.visceralFatRating) ||
          (previousDayEntry?.visceralFatRating !== undefined &&
            isUnusualVisceralFatDelta(
              current.visceralFatRating,
              previousDayEntry.visceralFatRating,
            )))) ||
      (current.bodyWaterPercent !== undefined &&
        (isUnusualBodyWaterPercent(current.bodyWaterPercent) ||
          (previousDayEntry?.bodyWaterPercent !== undefined &&
            isUnusualBodyWaterPercentDelta(
              current.bodyWaterPercent,
              previousDayEntry.bodyWaterPercent,
            )))) ||
      (current.boneMassKg !== undefined &&
        (isUnusualBoneMassKg(current.boneMassKg) ||
          (previousDayEntry?.boneMassKg !== undefined &&
            isUnusualBoneMassDeltaKg(
              current.boneMassKg,
              previousDayEntry.boneMassKg,
            )))) ||
      (current.bodyFatPercent !== undefined &&
        (isUnusualBodyFatPercent(current.bodyFatPercent) ||
          (previousDayEntry?.bodyFatPercent !== undefined &&
            isUnusualBodyFatPercentDelta(
              current.bodyFatPercent,
              previousDayEntry.bodyFatPercent,
            ))))
    const unchangedSincePendingWarning =
      pendingUnusualBodyComposition !== null &&
      pendingUnusualBodyComposition.muscleMassKg === current.muscleMassKg &&
      pendingUnusualBodyComposition.visceralFatRating ===
        current.visceralFatRating &&
      pendingUnusualBodyComposition.bodyWaterPercent ===
        current.bodyWaterPercent &&
      pendingUnusualBodyComposition.boneMassKg === current.boneMassKg &&
      pendingUnusualBodyComposition.bodyFatPercent === current.bodyFatPercent
    if (isUnusual && !unchangedSincePendingWarning) {
      setPendingUnusualBodyComposition(current)
      return
    }
    setPendingUnusualBodyComposition(null)
    setIsEditingBodyComposition(false)
    persist(getValues())
    setHasSavedBodyComposition(
      current.muscleMassKg !== undefined ||
        current.visceralFatRating !== undefined ||
        current.bodyWaterPercent !== undefined ||
        current.boneMassKg !== undefined ||
        current.bodyFatPercent !== undefined,
    )
  }

  /** #742 — fill parsed screenshot values, then the usual save path
   * (schema + unusual-jump confirm). Unparsed fields stay as they were. */
  function applyBodyCompositionPatch(patch: {
    muscleMassKg?: number
    visceralFatRating?: number
    bodyWaterPercent?: number
    boneMassKg?: number
    bodyFatPercent?: number
  }) {
    if (patch.muscleMassKg !== undefined) {
      setValue('muscleMassKg', patch.muscleMassKg)
    }
    if (patch.visceralFatRating !== undefined) {
      setValue('visceralFatRating', patch.visceralFatRating)
    }
    if (patch.bodyWaterPercent !== undefined) {
      setValue('bodyWaterPercent', patch.bodyWaterPercent)
    }
    if (patch.boneMassKg !== undefined) {
      setValue('boneMassKg', patch.boneMassKg)
    }
    if (patch.bodyFatPercent !== undefined) {
      setValue('bodyFatPercent', patch.bodyFatPercent)
    }
    saveBodyComposition()
  }

  function discardUnusualBodyCompositionWarning() {
    setPendingUnusualBodyComposition(null)
  }

  // #424
  function cancelEditBodyComposition() {
    setValue('muscleMassKg', initialValues.muscleMassKg)
    setValue('visceralFatRating', initialValues.visceralFatRating)
    setValue('bodyWaterPercent', initialValues.bodyWaterPercent)
    setValue('boneMassKg', initialValues.boneMassKg)
    setValue('bodyFatPercent', initialValues.bodyFatPercent)
    clearErrors('muscleMassKg')
    clearErrors('visceralFatRating')
    clearErrors('bodyWaterPercent')
    clearErrors('boneMassKg')
    clearErrors('bodyFatPercent')
    setPendingUnusualBodyComposition(null)
    setIsEditingBodyComposition(false)
  }

  function requestDeleteBodyComposition() {
    setIsConfirmingDeleteBodyComposition(true)
  }

  function cancelDeleteBodyComposition() {
    setIsConfirmingDeleteBodyComposition(false)
  }

  function confirmDeleteBodyComposition() {
    const next = {
      ...getValues(),
      muscleMassKg: undefined,
      visceralFatRating: undefined,
      bodyWaterPercent: undefined,
      boneMassKg: undefined,
      bodyFatPercent: undefined,
    }
    reset(next)
    persist(next)
    setIsConfirmingDeleteBodyComposition(false)
    setPendingUnusualBodyComposition(null)
    clearErrors('muscleMassKg')
    clearErrors('visceralFatRating')
    clearErrors('bodyWaterPercent')
    clearErrors('boneMassKg')
    clearErrors('bodyFatPercent')
    setIsEditingBodyComposition(true)
    setHasSavedBodyComposition(false)
  }

  // #435 — the hard schema bounds `saveBodyComposition()` already checks
  // (above) only ever ran at Save time, so an absurd value sat looking
  // accepted in the input until the user actually tapped Save. Validates
  // one field on blur (not every keystroke, which would flash an error on a
  // half-typed number, e.g. "2" -> "27" on the way to "2.7") — reuses the
  // exact same schema, doesn't replace the Save-time check (still needed:
  // blurring away without ever re-focusing the field would otherwise let an
  // invalid value slip through un-validated at Save). Deliberately scoped
  // to just these 5 fields, not weight/waist/hip/sleep/steps, per the
  // resolved design fork.
  function validateBodyCompositionFieldOnBlur(
    field:
      | 'muscleMassKg'
      | 'visceralFatRating'
      | 'bodyWaterPercent'
      | 'boneMassKg'
      | 'bodyFatPercent',
    schema:
      | typeof muscleMassKgSchema
      | typeof visceralFatRatingSchema
      | typeof bodyWaterPercentSchema
      | typeof boneMassKgSchema
      | typeof bodyFatPercentSchema,
  ) {
    const result = schema.safeParse(getValues(field))
    if (!result.success) {
      setError(field, { message: t.dailyEntry.invalidValueMessage })
    } else {
      clearErrors(field)
    }
  }

  return {
    t,
    locale,
    alwaysEditable,
    errors,
    register,
    // #664
    entryComparisonBaselines,
    // Weight
    weightKg,
    showWeightAsDisplay,
    isEditingWeight,
    setIsEditingWeight,
    pendingUnusualWeight,
    saveWeight,
    discardUnusualWeightWarning,
    canCancelWeightEdit,
    cancelEditWeight,
    isConfirmingDeleteWeight,
    canDeleteWeight,
    requestDeleteWeight,
    confirmDeleteWeight,
    cancelDeleteWeight,
    // Sleep
    trackedFields,
    sleepHours,
    deepSleepHours,
    showSleepAsDisplay,
    setIsEditingSleep,
    sleepHoursPart,
    setSleepHoursPart,
    sleepMinutesPart,
    setSleepMinutesPart,
    deepSleepHoursPart,
    setDeepSleepHoursPart,
    deepSleepMinutesPart,
    setDeepSleepMinutesPart,
    saveSleep,
    applySleepPatch,
    canCancelSleepEdit,
    cancelEditSleep,
    isConfirmingDeleteSleep,
    canDeleteSleep,
    requestDeleteSleep,
    confirmDeleteSleep,
    cancelDeleteSleep,
    // Meals/macros
    dayTotalCalories,
    dayMacrosSummary,
    dayMacrosDescription,
    dayRemainingMacrosSummary,
    dayRemainingMacrosDescription,
    remainingKcal,
    calorieEntries,
    setValue,
    getValues,
    persist,
    dailyCalorieTargetKcal,
    date,
    // Day totals (#549)
    dayTotals,
    dayTotalsSavedSummary,
    isEditingDayTotals,
    dayTotalsKcalInput,
    setDayTotalsKcalInput,
    dayTotalsProteinInput,
    setDayTotalsProteinInput,
    dayTotalsFatInput,
    setDayTotalsFatInput,
    dayTotalsCarbsInput,
    setDayTotalsCarbsInput,
    dayTotalsFiberInput,
    setDayTotalsFiberInput,
    dayTotalsError,
    saveDayTotals,
    clearDayTotals,
    startEditDayTotals,
    // Steps
    showStepsAsDisplay,
    steps,
    setIsEditingSteps,
    saveSteps,
    canCancelStepsEdit,
    cancelEditSteps,
    // Body measurements
    waistCm,
    hipCm,
    showBodyMeasurementsAsDisplay,
    setIsEditingBodyMeasurements,
    saveBodyMeasurements,
    canCancelBodyMeasurementsEdit,
    cancelEditBodyMeasurements,
    isConfirmingDeleteBodyMeasurements,
    canDeleteBodyMeasurements,
    requestDeleteBodyMeasurements,
    confirmDeleteBodyMeasurements,
    cancelDeleteBodyMeasurements,
    // Body composition
    muscleMassKg,
    visceralFatRating,
    bodyWaterPercent,
    boneMassKg,
    bodyFatPercent,
    showBodyCompositionAsDisplay,
    setIsEditingBodyComposition,
    saveBodyComposition,
    applyBodyCompositionPatch,
    pendingUnusualBodyComposition,
    discardUnusualBodyCompositionWarning,
    canCancelBodyCompositionEdit,
    cancelEditBodyComposition,
    isConfirmingDeleteBodyComposition,
    canDeleteBodyComposition,
    requestDeleteBodyComposition,
    confirmDeleteBodyComposition,
    cancelDeleteBodyComposition,
    validateBodyCompositionFieldOnBlur,
    // Note
    note,
    showNoteAsDisplay,
    setIsEditingNote,
    saveNote,
    canCancelNoteEdit,
    cancelEditNote,
    // Mood
    dayEmotion,
    saveMood,
    // Water
    waterTrackingEnabled,
    waterEntries,
    addWaterEntry,
    removeWaterEntry,
    // Constipation
    digestionTrackingEnabled,
    hadConstipation,
    setHadConstipation,
    // Alcohol
    alcoholTrackingEnabled,
    hadAlcohol,
    setHadAlcohol,
    // Night eating
    sex,
    nightEatingOverride,
    nightEatingEffective,
    setNightEatingOverride,
  }
}

export type DailyEntryFormState = ReturnType<typeof useDailyEntryFormState>
