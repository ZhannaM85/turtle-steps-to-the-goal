import Dexie, { type Table } from 'dexie'
import type { Goal } from '@/domain/goal'
import type { DailyEntry } from '@/domain/dailyEntry'

export class AppDatabase extends Dexie {
  goals!: Table<Goal, string>
  dailyEntries!: Table<DailyEntry, string>

  constructor() {
    super('turtle-steps-to-the-goal')
    this.version(1).stores({
      goals: 'id, createdAt',
      dailyEntries: 'id, &date',
    })
  }
}

export const db = new AppDatabase()
