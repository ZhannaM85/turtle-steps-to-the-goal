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
    createdAt: identity.createdAt,
    updatedAt: new Date().toISOString(),
  }
}
