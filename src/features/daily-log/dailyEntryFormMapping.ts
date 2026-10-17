import type { DailyEntry } from '@/domain/dailyEntry'
import type { DailyEntryFormValues } from './dailyEntryFormSchema'

export function entryToFormValues(
  entry: DailyEntry | null,
): Partial<DailyEntryFormValues> {
  if (!entry) return {}
  return {
    weightKg: entry.weightKg,
    calorieEntries: entry.calorieEntries,
    dayTotals: entry.dayTotals,
    note: entry.note,
    morningNote: entry.morningNote,
    emotion: entry.emotion,
    sleepHours: entry.sleepHours,
    deepSleepHours: entry.deepSleepHours,
    steps: entry.steps,
    onPeriod: entry.onPeriod,
    hadConstipation: entry.hadConstipation,
    hadAlcohol: entry.hadAlcohol,
    nightEatingOverride: entry.nightEatingOverride,
    nightEatingRemember: entry.nightEatingRemember,
    nightEatingReason: entry.nightEatingReason,
    nightEatingNoEasy: entry.nightEatingNoEasy,
    nightEatingNoWhatHelped: entry.nightEatingNoWhatHelped,
    waterEntries: entry.waterEntries,
    waistCm: entry.waistCm,
    hipCm: entry.hipCm,
    bodyFatPercent: entry.bodyFatPercent,
    muscleMassKg: entry.muscleMassKg,
    visceralFatRating: entry.visceralFatRating,
    bodyWaterPercent: entry.bodyWaterPercent,
    boneMassKg: entry.boneMassKg,
  }
}

export function formValuesToEntry(
  values: DailyEntryFormValues,
  date: string,
  identity: { id: string; createdAt: string },
  existing?: Pick<
    DailyEntry,
    | 'nightEatingNoThoughts'
    | 'weightKg'
    | 'sleepHours'
    | 'deepSleepHours'
    | 'weightFromAppleHealth'
    | 'sleepFromAppleHealth'
  > | null,
): DailyEntry {
  // #1100 — keep Apple Health provenance only while the synced value is
  // unchanged; any edit/delete clears the flag.
  const weightFromAppleHealth =
    values.weightKg !== undefined &&
    values.weightKg === existing?.weightKg &&
    existing.weightFromAppleHealth === true
      ? true
      : undefined
  const sleepFromAppleHealth =
    values.sleepHours !== undefined &&
    values.sleepHours === existing?.sleepHours &&
    values.deepSleepHours === existing?.deepSleepHours &&
    existing.sleepFromAppleHealth === true
      ? true
      : undefined

  return {
    id: identity.id,
    date,
    weightKg: values.weightKg,
    weightFromAppleHealth,
    calorieEntries: values.calorieEntries,
    dayTotals: values.dayTotals,
    note: values.note,
    morningNote: values.morningNote,
    emotion: values.emotion,
    sleepHours: values.sleepHours,
    deepSleepHours: values.deepSleepHours,
    sleepFromAppleHealth,
    steps: values.steps,
    onPeriod: values.onPeriod,
    hadConstipation: values.hadConstipation,
    hadAlcohol: values.hadAlcohol,
    nightEatingOverride: values.nightEatingOverride,
    nightEatingRemember: values.nightEatingRemember,
    nightEatingReason: values.nightEatingReason,
    nightEatingNoEasy: values.nightEatingNoEasy,
    nightEatingNoWhatHelped: values.nightEatingNoWhatHelped,
    // #842 — do not migrate or rewrite thoughts; keep whatever was stored.
    nightEatingNoThoughts: existing?.nightEatingNoThoughts,
    waterEntries: values.waterEntries,
    waistCm: values.waistCm,
    hipCm: values.hipCm,
    bodyFatPercent: values.bodyFatPercent,
    muscleMassKg: values.muscleMassKg,
    visceralFatRating: values.visceralFatRating,
    bodyWaterPercent: values.bodyWaterPercent,
    boneMassKg: values.boneMassKg,
    createdAt: identity.createdAt,
    updatedAt: new Date().toISOString(),
  }
}
