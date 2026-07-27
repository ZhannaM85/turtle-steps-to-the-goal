import type { DailyEntry } from '@/domain/dailyEntry'

/** The subset of `DailyEntry` an external-source import (Zepp Life, Apple
 * Health, ...) can fill in for a date — everything else on that day's
 * entry (meals, notes, mood, fields the source has no equivalent for) is
 * left untouched by `mergeDailyEntryPatches`, since a patch only ever
 * carries the fields its source actually provided. Deliberately source-
 * agnostic (no `id`/`date`/`createdAt`/`updatedAt` — `mergeDailyEntryPatches`
 * owns those) so every importer shares one merge implementation. */
export type DailyEntryPatch = Partial<
  Omit<DailyEntry, 'id' | 'date' | 'createdAt' | 'updatedAt'>
>

export interface DailyEntryPatchMergeResult {
  daysImported: number
  /** Days that already had a `DailyEntry` before this import — an imported
   * value overwrites the matching field(s) on that entry (device data
   * wins on conflict, the user's chosen policy for #365), same precedent
   * as the existing JSON backup import's own "imported data wins"
   * behavior. */
  daysUpdated: number
  entriesToUpsert: DailyEntry[]
}

/**
 * Merges a `Map<date, DailyEntryPatch>` from any external-source importer
 * into this app's existing `DailyEntry` records — one merge implementation
 * shared by every importer (Zepp Life CSV, Apple Health XML, ...) rather
 * than each reimplementing the same existing-entry-lookup/field-patch/
 * upsert shape.
 */
export function mergeDailyEntryPatches(
  patches: Map<string, DailyEntryPatch>,
  existingEntries: DailyEntry[],
): DailyEntryPatchMergeResult {
  const existingByDate = new Map(
    existingEntries.map((entry) => [entry.date, entry]),
  )
  const now = new Date().toISOString()
  const entriesToUpsert: DailyEntry[] = []
  let daysUpdated = 0

  for (const [date, patch] of patches) {
    const existing = existingByDate.get(date)
    if (existing) daysUpdated++
    const base: DailyEntry = existing ?? {
      id: crypto.randomUUID(),
      date,
      createdAt: now,
      updatedAt: now,
    }
    entriesToUpsert.push({ ...base, ...patch, updatedAt: now })
  }

  return { daysImported: patches.size, daysUpdated, entriesToUpsert }
}
