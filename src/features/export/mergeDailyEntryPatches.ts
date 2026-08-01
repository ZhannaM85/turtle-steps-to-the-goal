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

/**
 * #496 — how a re-import resolves per-field conflicts with an existing
 * day's value. `fillGaps` (the safer default) never replaces a field that
 * already has a local value, so a manual weight correction survives a later
 * Zepp/Apple Health/MFP re-import. `overwrite` is the pre-#496 policy
 * (imported value wins) for when the wearable *should* replace local.
 * JSON backup restore stays its own path and is unaffected.
 */
export type DailyEntryImportMode = 'fillGaps' | 'overwrite'

export interface DailyEntryPatchMergeResult {
  daysImported: number
  /** Days that already had a `DailyEntry` before this import and received
   * at least one field from the patch (under `fillGaps`, days where every
   * patched field was already filled are skipped and not counted). */
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

function isLocalFieldEmpty(
  existing: DailyEntry,
  key: keyof DailyEntryPatch,
): boolean {
  const value = existing[key]
  if (value === undefined) return true
  // Empty arrays (e.g. waterEntries: []) count as a gap to fill — same as
  // missing. Non-empty lists are "already have something local."
  if (Array.isArray(value) && value.length === 0) return true
  return false
}

/**
 * Under `fillGaps`, drop patch fields that already have a local value.
 * `calorieEntries` is special (#367): meals always append alongside local
 * ones rather than replacing them, so they are never treated as a
 * conflict field — include them whenever the patch carries any.
 */
function applyImportMode(
  patch: DailyEntryPatch,
  existing: DailyEntry | undefined,
  mode: DailyEntryImportMode,
): DailyEntryPatch | null {
  if (!existing || mode === 'overwrite') return patch

  const kept: DailyEntryPatch = {}
  for (const key of Object.keys(patch) as (keyof DailyEntryPatch)[]) {
    if (key === 'calorieEntries') {
      if (patch.calorieEntries !== undefined) {
        kept.calorieEntries = patch.calorieEntries
      }
      continue
    }
    if (isLocalFieldEmpty(existing, key) && patch[key] !== undefined) {
      // Assign one key at a time — patch values are already typed per key.
      Object.assign(kept, { [key]: patch[key] })
    }
  }
  return Object.keys(kept).length > 0 ? kept : null
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
  /** #496 — defaults to `fillGaps` so re-imports don't wipe manual edits. */
  mode: DailyEntryImportMode = 'fillGaps',
): DailyEntryPatchMergeResult {
  const existingByDate = new Map(
    existingEntries.map((entry) => [entry.date, entry]),
  )
  const now = new Date().toISOString()
  const entriesToUpsert: DailyEntry[] = []
  let daysUpdated = 0

  for (const [date, patch] of patches) {
    const existing = existingByDate.get(date)
    const effectivePatch = applyImportMode(patch, existing, mode)
    if (!effectivePatch) continue

    if (existing) daysUpdated++
    const base: DailyEntry = existing ?? {
      id: crypto.randomUUID(),
      date,
      createdAt: now,
      updatedAt: now,
    }
    // #367 — every other field here is a scalar (imported value wins on
    // conflict under `overwrite`, or fills only when local is empty under
    // `fillGaps` — see applyImportMode), but calorieEntries is a list: a
    // MyFitnessPal import's meals should land *alongside* whatever is
    // already logged for that date, not replace it wholesale the way a
    // plain `{...patch}` spread would. Resolved directly by the user:
    // append, accepting that the same real meal logged both by hand and
    // present in the import shows up twice — no dedup requested. Same
    // append rule in both import modes (#496).
    const calorieEntries = effectivePatch.calorieEntries
      ? [...(existing?.calorieEntries ?? []), ...effectivePatch.calorieEntries]
      : undefined
    entriesToUpsert.push({
      ...base,
      ...effectivePatch,
      ...(calorieEntries ? { calorieEntries } : {}),
      updatedAt: now,
    })
  }

  return {
    daysImported: entriesToUpsert.length,
    daysUpdated,
    entriesToUpsert,
  }
}
