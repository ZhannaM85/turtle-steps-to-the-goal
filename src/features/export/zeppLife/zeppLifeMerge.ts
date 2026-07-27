import type { DailyEntry } from '@/domain/dailyEntry'
import type { ZeppLifePatch } from './zeppLifeParser'

export interface ZeppLifeMergeResult {
  daysImported: number
  /** Days that already had a `DailyEntry` before this import — a Zepp value
   * overwrites the matching field(s) on that entry, per the user's chosen
   * merge policy (device data wins), same precedent as the existing JSON
   * backup import's own "imported data wins" behavior. Everything else on
   * that day's entry (meals, notes, mood, fields with no Zepp equivalent)
   * is left untouched, since a patch only ever carries the fields Zepp
   * actually provided. */
  daysUpdated: number
  entriesToUpsert: DailyEntry[]
}

export function mergeZeppLifePatches(
  patches: Map<string, ZeppLifePatch>,
  existingEntries: DailyEntry[],
): ZeppLifeMergeResult {
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
