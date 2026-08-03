import type { WeeklyNote } from './WeeklyNote'

export interface WeeklyNoteRepository {
  getAll(): Promise<WeeklyNote[]>
  getByWeekStart(weekStart: string): Promise<WeeklyNote | undefined>
  upsert(note: WeeklyNote): Promise<void>
  delete(weekStart: string): Promise<void>
}
