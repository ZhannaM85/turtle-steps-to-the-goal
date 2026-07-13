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
  }
}

export function formValuesToEntry(
  values: DailyEntryFormValues,
  date: string,
  existingEntry: DailyEntry | null,
): DailyEntry {
  const now = new Date().toISOString()
  return {
    id: existingEntry?.id ?? crypto.randomUUID(),
    date,
    weightKg: values.weightKg,
    calorieEntries: values.calorieEntries,
    note: values.note,
    createdAt: existingEntry?.createdAt ?? now,
    updatedAt: now,
  }
}
