import { persistableText } from '@/shared/lib/isBlankSaveValue'
import {
  bodyFatPercentSchema,
  bodyWaterPercentSchema,
  boneMassKgSchema,
  deepSleepHoursSchema,
  hipCmSchema,
  muscleMassKgSchema,
  sleepHoursSchema,
  stepsSchema,
  visceralFatRatingSchema,
  waistCmSchema,
  weightSchema,
  type DailyEntryFormValues,
} from './dailyEntryFormSchema'
import type { SavedNoteLikeFields } from './useDailyEntryNoteFields'

/** Shared persist sanitize so in-progress drafts on other fields don't ride along (#447). */
export function sanitizeDailyEntryFormValues(
  values: DailyEntryFormValues,
  initialValues: DailyEntryFormValues,
  savedNotes: SavedNoteLikeFields,
): DailyEntryFormValues {
  return {
    ...values,
    weightKg: weightSchema.safeParse(values.weightKg).success
      ? values.weightKg
      : initialValues.weightKg,
    note: persistableText(values.note, savedNotes.note),
    morningNote: persistableText(values.morningNote, savedNotes.morningNote),
    nightEatingReason: persistableText(
      values.nightEatingReason,
      savedNotes.nightEatingReason,
    ),
    nightEatingNoWhatHelped: persistableText(
      values.nightEatingNoWhatHelped,
      savedNotes.nightEatingNoWhatHelped,
    ),
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
    bodyWaterPercent: bodyWaterPercentSchema.safeParse(values.bodyWaterPercent)
      .success
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
