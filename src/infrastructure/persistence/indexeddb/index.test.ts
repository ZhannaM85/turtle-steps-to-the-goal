import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import type { Goal } from '@/domain/goal'
import type { MealItem } from '@/domain/mealItem'
import type { Recipe } from '@/domain/recipe'
import { db } from './db'
import { IndexedDbGoalRepository } from './goalRepository'
import { IndexedDbDailyEntryRepository } from './dailyEntryRepository'
import { IndexedDbMealItemRepository } from './mealItemRepository'
import { IndexedDbRecipeRepository } from './recipeRepository'

const goalRepository = new IndexedDbGoalRepository()
const dailyEntryRepository = new IndexedDbDailyEntryRepository()
const mealItemRepository = new IndexedDbMealItemRepository()
const recipeRepository = new IndexedDbRecipeRepository()

function makeMealItem(overrides: Partial<MealItem> = {}): MealItem {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    name: 'Pizza',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function makeRecipe(overrides: Partial<Recipe> = {}): Recipe {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    name: 'Chili',
    ingredients: [],
    servings: 4,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    targetWeeklyLossKg: 1,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function makeEntry(overrides: Partial<DailyEntry> = {}): DailyEntry {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    date: '2026-01-01',
    weightKg: 80,
    calorieEntries: [
      {
        id: crypto.randomUUID(),
        items: [{ id: crypto.randomUUID(), amountKcal: 2000 }],
        createdAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

beforeEach(async () => {
  await db.goals.clear()
  await db.dailyEntries.clear()
  await db.mealItems.clear()
  await db.recipes.clear()
})

afterEach(async () => {
  await db.goals.clear()
  await db.dailyEntries.clear()
  await db.mealItems.clear()
  await db.recipes.clear()
})

describe('IndexedDbGoalRepository', () => {
  it('returns undefined when there is no active goal', async () => {
    await expect(goalRepository.getActiveGoal()).resolves.toBeUndefined()
  })

  it('saves and retrieves the most recently created goal as active', async () => {
    const older = makeGoal({ createdAt: '2026-01-01T00:00:00.000Z' })
    const newer = makeGoal({ createdAt: '2026-02-01T00:00:00.000Z' })
    await goalRepository.saveGoal(older)
    await goalRepository.saveGoal(newer)

    const active = await goalRepository.getActiveGoal()
    expect(active?.id).toBe(newer.id)
  })

  it('returns all goals for export/history purposes', async () => {
    const older = makeGoal({ createdAt: '2026-01-01T00:00:00.000Z' })
    const newer = makeGoal({ createdAt: '2026-02-01T00:00:00.000Z' })
    await goalRepository.saveGoal(older)
    await goalRepository.saveGoal(newer)

    const all = await goalRepository.getAll()
    expect(all.map((g) => g.id).sort()).toEqual([older.id, newer.id].sort())
  })

  it('deletes a goal by id (#174)', async () => {
    const keep = makeGoal({ createdAt: '2026-01-01T00:00:00.000Z' })
    const remove = makeGoal({ createdAt: '2026-02-01T00:00:00.000Z' })
    await goalRepository.saveGoal(keep)
    await goalRepository.saveGoal(remove)

    await goalRepository.deleteGoal(remove.id)

    const all = await goalRepository.getAll()
    expect(all.map((g) => g.id)).toEqual([keep.id])
  })
})

describe('IndexedDbDailyEntryRepository', () => {
  it('upserts and reads an entry back by date', async () => {
    const entry = makeEntry({ date: '2026-03-01' })
    await dailyEntryRepository.upsert(entry)

    const found = await dailyEntryRepository.getByDate('2026-03-01')
    expect(found).toEqual(entry)
  })

  it('enforces one entry per date', async () => {
    await dailyEntryRepository.upsert(makeEntry({ date: '2026-03-01' }))
    await expect(
      dailyEntryRepository.upsert(makeEntry({ date: '2026-03-01' })),
    ).rejects.toThrow()
  })

  it('updates an existing entry in place when upserting by the same id', async () => {
    const entry = makeEntry({ date: '2026-03-01', weightKg: 80 })
    await dailyEntryRepository.upsert(entry)
    await dailyEntryRepository.upsert({ ...entry, weightKg: 79.5 })

    const all = await dailyEntryRepository.getAll()
    expect(all).toHaveLength(1)
    expect(all[0].weightKg).toBe(79.5)
  })

  it('returns entries within an inclusive date range, sorted by date', async () => {
    await dailyEntryRepository.upsert(makeEntry({ date: '2026-03-03' }))
    await dailyEntryRepository.upsert(makeEntry({ date: '2026-03-01' }))
    await dailyEntryRepository.upsert(makeEntry({ date: '2026-03-05' }))

    const range = await dailyEntryRepository.getRange(
      '2026-03-01',
      '2026-03-03',
    )
    expect(range.map((e) => e.date)).toEqual(['2026-03-01', '2026-03-03'])
  })

  it('deletes an entry by id', async () => {
    const entry = makeEntry({ date: '2026-03-01' })
    await dailyEntryRepository.upsert(entry)
    await dailyEntryRepository.delete(entry.id)

    await expect(dailyEntryRepository.getAll()).resolves.toEqual([])
  })

})

describe('IndexedDbMealItemRepository', () => {
  it('returns undefined when no item has that name', async () => {
    await expect(
      mealItemRepository.findByName('Pizza'),
    ).resolves.toBeUndefined()
  })

  it('upserts and finds an item by exact name', async () => {
    const item = makeMealItem({ name: 'Pizza' })
    await mealItemRepository.upsert(item)

    await expect(mealItemRepository.findByName('Pizza')).resolves.toEqual(
      item,
    )
  })

  it('enforces unique names', async () => {
    await mealItemRepository.upsert(makeMealItem({ name: 'Pizza' }))
    await expect(
      mealItemRepository.upsert(makeMealItem({ name: 'Pizza' })),
    ).rejects.toThrow()
  })

  it('returns all items ordered by name', async () => {
    await mealItemRepository.upsert(makeMealItem({ name: 'Salad' }))
    await mealItemRepository.upsert(makeMealItem({ name: 'Avocado toast' }))

    const all = await mealItemRepository.getAll()
    expect(all.map((i) => i.name)).toEqual(['Avocado toast', 'Salad'])
  })

  it('deletes an item by id', async () => {
    const item = makeMealItem({ name: 'Pizza' })
    await mealItemRepository.upsert(item)
    await mealItemRepository.delete(item.id)

    await expect(mealItemRepository.getAll()).resolves.toEqual([])
  })

  describe('barcode (#256)', () => {
    it('returns undefined when no item has that barcode', async () => {
      await expect(
        mealItemRepository.findByBarcode('0123456789012'),
      ).resolves.toBeUndefined()
    })

    it('upserts and finds an item by exact barcode', async () => {
      const item = makeMealItem({ name: 'Pizza', barcode: '0123456789012' })
      await mealItemRepository.upsert(item)

      await expect(
        mealItemRepository.findByBarcode('0123456789012'),
      ).resolves.toEqual(item)
    })

    it('enforces unique barcodes', async () => {
      await mealItemRepository.upsert(
        makeMealItem({ name: 'Pizza', barcode: '0123456789012' }),
      )
      await expect(
        mealItemRepository.upsert(
          makeMealItem({ name: 'Salad', barcode: '0123456789012' }),
        ),
      ).rejects.toThrow()
    })

    it('allows any number of items with no barcode at all (sparse index)', async () => {
      await mealItemRepository.upsert(makeMealItem({ name: 'Pizza' }))
      await expect(
        mealItemRepository.upsert(makeMealItem({ name: 'Salad' })),
      ).resolves.not.toThrow()

      const all = await mealItemRepository.getAll()
      expect(all).toHaveLength(2)
    })
  })
})

describe('IndexedDbRecipeRepository (#251)', () => {
  it('returns an empty array with no recipes yet', async () => {
    await expect(recipeRepository.getAll()).resolves.toEqual([])
  })

  it('upserts and returns a recipe', async () => {
    const recipe = makeRecipe({ name: 'Chili' })
    await recipeRepository.upsert(recipe)

    await expect(recipeRepository.getAll()).resolves.toEqual([recipe])
  })

  it('returns recipes sorted by name', async () => {
    await recipeRepository.upsert(makeRecipe({ name: 'Soup' }))
    await recipeRepository.upsert(makeRecipe({ name: 'Chili' }))

    const all = await recipeRepository.getAll()
    expect(all.map((r) => r.name)).toEqual(['Chili', 'Soup'])
  })

  it('updates an existing recipe in place when upserted again by id', async () => {
    const recipe = makeRecipe({ name: 'Chili', servings: 4 })
    await recipeRepository.upsert(recipe)
    await recipeRepository.upsert({ ...recipe, servings: 6 })

    const all = await recipeRepository.getAll()
    expect(all).toHaveLength(1)
    expect(all[0].servings).toBe(6)
  })

  it('deletes a recipe by id', async () => {
    const recipe = makeRecipe()
    await recipeRepository.upsert(recipe)
    await recipeRepository.delete(recipe.id)

    await expect(recipeRepository.getAll()).resolves.toEqual([])
  })

  it('allows two recipes with the same name (no unique-name constraint, unlike mealItems)', async () => {
    await recipeRepository.upsert(makeRecipe({ name: 'Chili' }))
    await expect(
      recipeRepository.upsert(makeRecipe({ name: 'Chili' })),
    ).resolves.not.toThrow()

    const all = await recipeRepository.getAll()
    expect(all).toHaveLength(2)
  })
})
