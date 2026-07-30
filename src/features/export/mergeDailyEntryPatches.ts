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
 * #369 — restricts every patch in the map to just `includedFields`, so a
 * user can opt out of specific data types (e.g. only import steps, leaving
 * their manually-tracked weight history untouched) rather than the import
 * always being all-or-nothing per source. A date whose patch has no
 * remaining fields after filtering is dropped from the map entirely,
 * rather than upserting/touching an entry with nothing real to add.
 */
export function filterPatchesToFields(
  patches: Map<string, DailyEntryPatch>,
  includedFields: ReadonlySet<keyof DailyEntryPatch>,
): Map<string, DailyEntryPatch> {
  const filtered = new Map<string, DailyEntryPatch>()
  for (const [date, patch] of patches) {
    const entries = Object.entries(patch).filter(([key]) =>
      includedFields.has(key as keyof DailyEntryPatch),
    )
    if (entries.length > 0) {
      filtered.set(date, Object.fromEntries(entries) as DailyEntryPatch)
    }
  }
  return filtered
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
    // #367 — every other field here is a scalar (imported value wins on
    // conflict, per #365's own precedent above), but calorieEntries is a
    // list: a MyFitnessPal import's meals should land *alongside* whatever
    // is already logged for that date, not replace it wholesale the way a
    // plain `{...patch}` spread would. Resolved directly by the user:
    // append, accepting that the same real meal logged both by hand and
    // present in the import shows up twice — no dedup requested.
    const calorieEntries = patch.calorieEntries
      ? [...(existing?.calorieEntries ?? []), ...patch.calorieEntries]
      : undefined
    entriesToUpsert.push({
      ...base,
      ...patch,
      ...(calorieEntries ? { calorieEntries } : {}),
      updatedAt: now,
    })
  }

  return { daysImported: patches.size, daysUpdated, entriesToUpsert }
}
