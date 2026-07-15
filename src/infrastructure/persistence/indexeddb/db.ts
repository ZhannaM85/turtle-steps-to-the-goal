import Dexie, { type Table } from 'dexie'
import type { Goal } from '@/domain/goal'
import type { DailyEntry } from '@/domain/dailyEntry'
import type { MealItem } from '@/domain/mealItem'

export class AppDatabase extends Dexie {
  goals!: Table<Goal, string>
  dailyEntries!: Table<DailyEntry, string>
  mealItems!: Table<MealItem, string>

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
    // #50: reusable meal-name library, independent of any CalorieEntry.note.
    // New store only — no upgrade() needed, nothing pre-existing to migrate.
    this.version(3).stores({
      goals: 'id, createdAt',
      dailyEntries: 'id, &date',
      mealItems: 'id, &name',
    })
  }
}

export const db = new AppDatabase()
