/**
 * Freeform note for one Monday–Sunday calendar week (#557) — distinct from
 * day `DailyEntry.note` and custom-metric entry notes. Keyed by ISO
 * `weekStart` (Monday), matching Dashboard weekly recap (#556).
 */
export interface WeeklyNote {
  weekStart: string
  note: string
  updatedAt: string
}
