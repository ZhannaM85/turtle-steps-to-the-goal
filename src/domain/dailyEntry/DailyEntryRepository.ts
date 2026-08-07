import type { DailyEntry } from './DailyEntry'

export interface DailyEntryRepository {
  getByDate(date: string): Promise<DailyEntry | undefined>
  getRange(start: string, end: string): Promise<DailyEntry[]>
  upsert(entry: DailyEntry): Promise<void>
  delete(id: string): Promise<void>
  getAll(): Promise<DailyEntry[]>
  /** The `date` of the earliest logged entry, or `undefined` if none exist
   * yet (#599 — a real usage signal for the backup reminder's fallback
   * reference point). */
  getEarliestEntryDate(): Promise<string | undefined>
}
