import type { DailyEntry, DailyEntryRepository } from '@/domain/dailyEntry'
import { db } from './db'

export class IndexedDbDailyEntryRepository implements DailyEntryRepository {
  async getByDate(date: string): Promise<DailyEntry | undefined> {
    return db.dailyEntries.where('date').equals(date).first()
  }

  async getRange(start: string, end: string): Promise<DailyEntry[]> {
    return db.dailyEntries
      .where('date')
      .between(start, end, true, true)
      .sortBy('date')
  }

  async upsert(entry: DailyEntry): Promise<void> {
    await db.dailyEntries.put(entry)
  }

  async delete(id: string): Promise<void> {
    await db.dailyEntries.delete(id)
  }

  async getAll(): Promise<DailyEntry[]> {
    return db.dailyEntries.orderBy('date').toArray()
  }
}
