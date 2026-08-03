import type { WeeklyNote, WeeklyNoteRepository } from '@/domain/weeklyNote'
import { db } from './db'

export class IndexedDbWeeklyNoteRepository implements WeeklyNoteRepository {
  async getAll(): Promise<WeeklyNote[]> {
    return (await db.weeklyNotes.toArray()).sort((a, b) =>
      b.weekStart.localeCompare(a.weekStart),
    )
  }

  async getByWeekStart(weekStart: string): Promise<WeeklyNote | undefined> {
    return db.weeklyNotes.get(weekStart)
  }

  async upsert(note: WeeklyNote): Promise<void> {
    await db.weeklyNotes.put(note)
  }

  async delete(weekStart: string): Promise<void> {
    await db.weeklyNotes.delete(weekStart)
  }
}
