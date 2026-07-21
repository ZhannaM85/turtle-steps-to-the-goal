import type { DailyEntry } from '@/domain/dailyEntry'
import type { DailyEntryFormValues } from './dailyEntryFormSchema'

export function entryToFormValues(
  entry: DailyEntry | null,
): Partial<DailyEntryFormValues> {
  if (!entry) return {}
  return {
    weightKg: entry.weightKg,
    calorieEntries: entry.calorieEntries,
    note: entry.note,
    emotion: entry.emotion,
    sleepHours: entry.sleepHours,
    deepSleepHours: entry.deepSleepHours,
    steps: entry.steps,
    onPeriod: entry.onPeriod,
    hadConstipation: entry.hadConstipation,
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
): DailyEntry {
  return {
    id: identity.id,
    date,
    weightKg: values.weightKg,
    calorieEntries: values.calorieEntries,
    note: values.note,
    emotion: values.emotion,
    sleepHours: values.sleepHours,
    deepSleepHours: values.deepSleepHours,
    steps: values.steps,
    onPeriod: values.onPeriod,
    hadConstipation: values.hadConstipation,
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
