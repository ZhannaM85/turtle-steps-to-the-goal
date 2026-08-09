import { format, parseISO, subDays } from 'date-fns'
import type { DailyEntry } from './DailyEntry'

/**
 * #664 — daily fields that get a live up/down comparison while editing and
 * an ⓘ tooltip after save. Calories/macros deliberately out of scope (meal-
 * derived, goal-dependent valence).
 */
export type ComparableEntryField =
  | 'weightKg'
  | 'steps'
  | 'sleepHours'
  | 'muscleMassKg'
  | 'visceralFatRating'
  | 'bodyWaterPercent'
  | 'boneMassKg'
  | 'bodyFatPercent'

/** Whether an increase is the desirable direction for this field. */
export type ComparisonValence = 'higherIsBetter' | 'lowerIsBetter'

export const ENTRY_FIELD_COMPARISON_VALENCE: Record<
  ComparableEntryField,
  ComparisonValence
> = {
  weightKg: 'lowerIsBetter',
  steps: 'higherIsBetter',
  sleepHours: 'higherIsBetter',
  muscleMassKg: 'higherIsBetter',
  visceralFatRating: 'lowerIsBetter',
  bodyWaterPercent: 'higherIsBetter',
  boneMassKg: 'higherIsBetter',
  bodyFatPercent: 'lowerIsBetter',
}

export type ComparisonTone = 'good' | 'bad'

export interface FieldBaseline {
  /** ISO date (`yyyy-MM-dd`) of the entry this value came from. */
  date: string
  value: number
  /** True when `date` is exactly one calendar day before the viewed day. */
  isYesterday: boolean
}

const DATE_FORMAT = 'yyyy-MM-dd'

export function fieldValueOnEntry(
  entry: DailyEntry,
  field: ComparableEntryField,
): number | undefined {
  const value = entry[field]
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

/**
 * Most recent entry before `beforeDate` that has `field` logged. Scans
 * descending by date so a gap day (no yesterday) still finds an older
 * baseline — wording then names that date instead of "yesterday".
 */
export function findMostRecentPriorFieldValue(
  entries: readonly DailyEntry[],
  field: ComparableEntryField,
  beforeDate: string,
): FieldBaseline | null {
  const yesterday = format(subDays(parseISO(beforeDate), 1), DATE_FORMAT)
  let best: DailyEntry | null = null
  for (const entry of entries) {
    if (entry.date >= beforeDate) continue
    if (fieldValueOnEntry(entry, field) === undefined) continue
    if (best === null || entry.date > best.date) best = entry
  }
  if (best === null) return null
  const value = fieldValueOnEntry(best, field)
  if (value === undefined) return null
  return {
    date: best.date,
    value,
    isYesterday: best.date === yesterday,
  }
}

/** Value logged on exactly `date` for `field`, if any. */
export function findFieldValueOnDate(
  entries: readonly DailyEntry[],
  field: ComparableEntryField,
  date: string,
): number | undefined {
  const entry = entries.find((candidate) => candidate.date === date)
  return entry ? fieldValueOnEntry(entry, field) : undefined
}

export function exactlyDaysBefore(date: string, days: number): string {
  return format(subDays(parseISO(date), days), DATE_FORMAT)
}

/**
 * Tone for a non-zero delta. Callers should skip rendering when current
 * equals baseline (no arrow either way).
 */
export function comparisonTone(
  current: number,
  baseline: number,
  valence: ComparisonValence,
): ComparisonTone | null {
  if (current === baseline) return null
  const increased = current > baseline
  if (valence === 'higherIsBetter') {
    return increased ? 'good' : 'bad'
  }
  return increased ? 'bad' : 'good'
}

export function comparisonDirection(
  current: number,
  baseline: number,
): 'up' | 'down' | null {
  if (current === baseline) return null
  return current > baseline ? 'up' : 'down'
}
