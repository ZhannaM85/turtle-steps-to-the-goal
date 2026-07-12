import type { DailyEntry } from './DailyEntry'

export interface DailyEntryRepository {
  getByDate(date: string): Promise<DailyEntry | undefined>
  getRange(start: string, end: string): Promise<DailyEntry[]>
  upsert(entry: DailyEntry): Promise<void>
  delete(id: string): Promise<void>
  getAll(): Promise<DailyEntry[]>
  getEarliestDate(): Promise<string | undefined>
}
