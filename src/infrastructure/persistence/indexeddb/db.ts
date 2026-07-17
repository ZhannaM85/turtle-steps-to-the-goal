import Dexie, { type Table } from 'dexie'
import type { Goal } from '@/domain/goal'
import type { DailyEntry } from '@/domain/dailyEntry'
import type { MealItem } from '@/domain/mealItem'
import type { FoodOverride } from '@/domain/foodOverride'

export class AppDatabase extends Dexie {
  goals!: Table<Goal, string>
  dailyEntries!: Table<DailyEntry, string>
  mealItems!: Table<MealItem, string>
  foodOverrides!: Table<FoodOverride, string>

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
    // #54: a meal's own emotion moves from the day's happy/unhappy/neutral
    // set to thumbsUp/thumbsDown/bellissimo. No auto-mapping (decided when
    // #54 was scoped) — clear existing meal-level emotion values outright
    // rather than guessing a translation. The day's own emotion (DailyEntry.
    // emotion) is untouched, that set isn't changing.
    this.version(4)
      .stores({
        goals: 'id, createdAt',
        dailyEntries: 'id, &date',
        mealItems: 'id, &name',
      })
      .upgrade((tx) =>
        tx
          .table('dailyEntries')
          .toCollection()
          .modify((entry) => {
            for (const meal of entry.calorieEntries ?? []) {
              delete meal.emotion
            }
          }),
      )
    // #81: a meal (CalorieEntry) becomes a group of 1+ items instead of a
    // single flat kcal/macro record, so multiple dishes eaten together
    // (soup + bread + cheese) can share one meal instead of becoming 3
    // separate ones. Each existing flat meal becomes a single-item group:
    // the item takes over amountKcal/proteinG/fatG/carbsG plus the old
    // `note` as its `name` (the note was already doing double duty as the
    // dish name); the group's own `note` is cleared since its meaning
    // fully transfers to the item name, while emotion/timeEaten stay on
    // the group.
    this.version(5)
      .stores({
        goals: 'id, createdAt',
        dailyEntries: 'id, &date',
        mealItems: 'id, &name',
      })
      .upgrade((tx) =>
        tx
          .table('dailyEntries')
          .toCollection()
          .modify((entry) => {
            if (!entry.calorieEntries) return
            entry.calorieEntries = entry.calorieEntries.map(
              (meal: {
                id: string
                amountKcal: number
                note?: string
                emotion?: string
                proteinG?: number
                fatG?: number
                carbsG?: number
                timeEaten?: string
                createdAt: string
              }) => ({
                id: meal.id,
                items: [
                  {
                    id: crypto.randomUUID(),
                    name: meal.note,
                    amountKcal: meal.amountKcal,
                    proteinG: meal.proteinG,
                    fatG: meal.fatG,
                    carbsG: meal.carbsG,
                  },
                ],
                emotion: meal.emotion,
                timeEaten: meal.timeEaten,
                createdAt: meal.createdAt,
              }),
            )
          }),
      )
    // #90: per-device customization of the curated foods.ts list (hide an
    // item, or correct its per-100g numbers) — keyed by the food's own
    // stable id, not a separate uuid, since there's at most one override
    // per food. New store only, no upgrade() needed.
    this.version(6).stores({
      goals: 'id, createdAt',
      dailyEntries: 'id, &date',
      mealItems: 'id, &name',
      foodOverrides: '&foodId',
    })
    // #129: a meal's reaction moves from the group (CalorieEntry.emotion,
    // no longer part of the type) onto each item. Only unambiguous for a
    // single-item meal, where the old group reaction clearly belonged to
    // that one dish — multi-item meals had no way to know which dish it
    // was about, so that data is simply dropped rather than guessed at
    // (same reasoning #54's v3->v4 clear used above for the older
    // happy/unhappy/neutral meal-emotion set).
    this.version(7)
      .stores({
        goals: 'id, createdAt',
        dailyEntries: 'id, &date',
        mealItems: 'id, &name',
        foodOverrides: '&foodId',
      })
      .upgrade((tx) =>
        tx
          .table('dailyEntries')
          .toCollection()
          .modify((entry) => {
            for (const meal of entry.calorieEntries ?? []) {
              const legacyEmotion = meal.emotion
              delete meal.emotion
              if (legacyEmotion && meal.items.length === 1) {
                meal.items[0].emotion = legacyEmotion
              }
            }
          }),
      )
  }
}

export const db = new AppDatabase()
