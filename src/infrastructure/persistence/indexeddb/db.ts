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
    // #21: caloriesConsumed (single number) -> calorieEntries (itemized list).
    this.version(2)
      .stores({
        goals: 'id, createdAt',
        dailyEntries: 'id, &date',
      })
      .upgrade((tx) =>
        tx
          .table('dailyEntries')
          .toCollection()
          .modify((entry) => {
            if (entry.caloriesConsumed !== undefined && !entry.calorieEntries) {
              entry.calorieEntries = [
                {
                  id: crypto.randomUUID(),
                  amountKcal: entry.caloriesConsumed,
                  createdAt: entry.createdAt,
                },
              ]
            }
            delete entry.caloriesConsumed
          }),
      )
  }
}

export const db = new AppDatabase()
