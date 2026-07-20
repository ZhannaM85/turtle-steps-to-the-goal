import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import type { FoodOverride } from '@/domain/foodOverride'
import type { Goal } from '@/domain/goal'
import type { MealItem } from '@/domain/mealItem'
import { db } from '@/infrastructure/persistence/indexeddb'
import {
  exportAllData,
  importAllData,
  InvalidBackupFileError,
  parseExportBundle,
} from './exportActions'

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
    date: '2026-03-01',
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

function makeFoodOverride(overrides: Partial<FoodOverride> = {}): FoodOverride {
  return {
    foodId: 'food-1',
    hidden: true,
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

beforeEach(async () => {
  await db.goals.clear()
  await db.dailyEntries.clear()
  await db.mealItems.clear()
  await db.foodOverrides.clear()
})

afterEach(async () => {
  await db.goals.clear()
  await db.dailyEntries.clear()
  await db.mealItems.clear()
  await db.foodOverrides.clear()
})

describe('exportAllData', () => {
  it('exports an empty bundle when there is no data', async () => {
    const bundle = await exportAllData()
    expect(bundle.goals).toEqual([])
    expect(bundle.dailyEntries).toEqual([])
  })

  it('exports all goals and entries currently stored', async () => {
    const goal = makeGoal()
    const entry = makeEntry()
    await db.goals.put(goal)
    await db.dailyEntries.put(entry)

    const bundle = await exportAllData()
    expect(bundle.goals).toEqual([goal])
    expect(bundle.dailyEntries).toEqual([entry])
  })

  it('exports meal items and food overrides currently stored (#113)', async () => {
    const item = makeMealItem()
    const override = makeFoodOverride()
    await db.mealItems.put(item)
    await db.foodOverrides.put(override)

    const bundle = await exportAllData()
    expect(bundle.mealItems).toEqual([item])
    expect(bundle.foodOverrides).toEqual([override])
  })
})

describe('importAllData', () => {
  it('round-trips an export back into an empty database', async () => {
    const goal = makeGoal()
    const entry = makeEntry()
    await db.goals.put(goal)
    await db.dailyEntries.put(entry)
    const bundle = await exportAllData()

    await db.goals.clear()
    await db.dailyEntries.clear()

    await importAllData(bundle)

    expect(await db.goals.toArray()).toEqual([goal])
    expect(await db.dailyEntries.toArray()).toEqual([entry])
  })

  it('round-trips the optional daily calorie target through parseExportBundle too (#208)', async () => {
    const goal = makeGoal({ dailyCalorieTargetKcal: 1800 })
    await db.goals.put(goal)
    const bundle = await exportAllData()

    await db.goals.clear()

    const parsed = parseExportBundle(JSON.parse(JSON.stringify(bundle)))
    await importAllData(parsed)

    const all = await db.goals.toArray()
    expect(all[0].dailyCalorieTargetKcal).toBe(1800)
  })

  it('merges into existing data instead of wiping it', async () => {
    const existingEntry = makeEntry({ date: '2026-03-02' })
    await db.dailyEntries.put(existingEntry)

    const backupEntry = makeEntry({ date: '2026-03-01' })
    await importAllData({
      version: 6,
      exportedAt: new Date().toISOString(),
      goals: [],
      dailyEntries: [backupEntry],
    })

    const all = await db.dailyEntries.toArray()
    expect(all).toHaveLength(2)
    expect(all.map((e) => e.date).sort()).toEqual(['2026-03-01', '2026-03-02'])
  })

  it('updates a same-date entry by date, not id (#207 — a re-imported backup carries its own ids, which almost never match a same-date entry logged locally since the backup was taken)', async () => {
    const existingEntry = makeEntry({
      id: 'local-id',
      date: '2026-03-01',
      weightKg: 80,
    })
    await db.dailyEntries.put(existingEntry)

    const backupEntry = makeEntry({
      id: 'backup-id',
      date: '2026-03-01',
      weightKg: 81,
    })
    await importAllData({
      version: 6,
      exportedAt: new Date().toISOString(),
      goals: [],
      dailyEntries: [backupEntry],
    })

    const all = await db.dailyEntries.toArray()
    expect(all).toHaveLength(1)
    expect(all[0].weightKg).toBe(81)
  })

  it('updates a same-name meal item by name, not id (#207, same reasoning as the daily-entry case above)', async () => {
    const existingItem = makeMealItem({
      id: 'local-id',
      name: 'Salmon',
      lastAmountKcal: 200,
    })
    await db.mealItems.put(existingItem)

    const backupItem = makeMealItem({
      id: 'backup-id',
      name: 'Salmon',
      lastAmountKcal: 208,
    })
    await importAllData({
      version: 6,
      exportedAt: new Date().toISOString(),
      goals: [],
      dailyEntries: [],
      mealItems: [backupItem],
    })

    const all = await db.mealItems.toArray()
    expect(all).toHaveLength(1)
    expect(all[0].lastAmountKcal).toBe(208)
  })

  it('round-trips meal items and food overrides (#113)', async () => {
    const item = makeMealItem()
    const override = makeFoodOverride()
    await db.mealItems.put(item)
    await db.foodOverrides.put(override)
    const bundle = await exportAllData()

    await db.mealItems.clear()
    await db.foodOverrides.clear()

    await importAllData(bundle)

    expect(await db.mealItems.toArray()).toEqual([item])
    expect(await db.foodOverrides.toArray()).toEqual([override])
  })

  it('imports fine when mealItems/foodOverrides are absent (older backups, #113)', async () => {
    await expect(
      importAllData({
        version: 6,
        exportedAt: new Date().toISOString(),
        goals: [],
        dailyEntries: [],
      }),
    ).resolves.not.toThrow()

    expect(await db.mealItems.toArray()).toEqual([])
    expect(await db.foodOverrides.toArray()).toEqual([])
  })
})

describe('parseExportBundle', () => {
  it('parses a valid bundle', () => {
    const bundle = {
      version: 6,
      exportedAt: '2026-01-01',
      goals: [],
      dailyEntries: [],
    }
    expect(parseExportBundle(bundle)).toEqual(bundle)
  })

  it('upgrades a v5 backup by folding a single-item meal\'s group reaction onto its item (#129)', () => {
    const v5Bundle = {
      version: 5,
      exportedAt: '2026-01-01',
      goals: [],
      dailyEntries: [
        {
          id: 'entry-1',
          date: '2026-03-01',
          weightKg: 80,
          calorieEntries: [
            {
              id: 'meal-1',
              items: [
                { id: 'item-1', name: 'Pizza', amountKcal: 500 },
              ],
              emotion: 'bellissimo',
              createdAt: '2026-03-01T00:00:00.000Z',
            },
            {
              id: 'meal-2',
              items: [
                { id: 'item-2', name: 'Soup', amountKcal: 200 },
                { id: 'item-3', name: 'Bread', amountKcal: 150 },
              ],
              emotion: 'thumbsUp',
              createdAt: '2026-03-01T00:00:00.000Z',
            },
          ],
          createdAt: '2026-03-01T00:00:00.000Z',
          updatedAt: '2026-03-01T00:00:00.000Z',
        },
      ],
    }

    const upgraded = parseExportBundle(v5Bundle)

    expect(upgraded.version).toBe(6)
    const [singleItemMeal, multiItemMeal] =
      upgraded.dailyEntries[0].calorieEntries!
    // Unambiguous single-item meal: the group's old reaction moves onto it.
    expect(singleItemMeal).not.toHaveProperty('emotion')
    expect(singleItemMeal.items[0].emotion).toBe('bellissimo')
    // Ambiguous multi-item meal: no way to know which dish it was about,
    // so the old group reaction is dropped rather than guessed at.
    expect(multiItemMeal).not.toHaveProperty('emotion')
    expect(multiItemMeal.items[0].emotion).toBeUndefined()
    expect(multiItemMeal.items[1].emotion).toBeUndefined()
  })

  it('upgrades a v4 backup by folding flat meals into single-item groups (#81)', () => {
    const v4Bundle = {
      version: 4,
      exportedAt: '2026-01-01',
      goals: [],
      dailyEntries: [
        {
          id: 'entry-1',
          date: '2026-03-01',
          weightKg: 80,
          calorieEntries: [
            {
              id: 'meal-1',
              amountKcal: 500,
              note: 'Pizza',
              proteinG: 20,
              createdAt: '2026-03-01T00:00:00.000Z',
            },
          ],
          createdAt: '2026-03-01T00:00:00.000Z',
          updatedAt: '2026-03-01T00:00:00.000Z',
        },
      ],
    }

    const upgraded = parseExportBundle(v4Bundle)

    expect(upgraded.version).toBe(6)
    const group = upgraded.dailyEntries[0].calorieEntries?.[0]
    expect(group?.id).toBe('meal-1')
    expect(group).not.toHaveProperty('note')
    expect(group?.items).toEqual([
      {
        id: expect.any(String),
        name: 'Pizza',
        amountKcal: 500,
        proteinG: 20,
        fatG: undefined,
        carbsG: undefined,
      },
    ])
  })

  it('upgrades a v3 backup by clearing old-format meal emotions (#54) and folding into groups (#81)', () => {
    const v3Bundle = {
      version: 3,
      exportedAt: '2026-01-01',
      goals: [],
      dailyEntries: [
        {
          id: 'entry-1',
          date: '2026-03-01',
          weightKg: 80,
          calorieEntries: [
            {
              id: 'meal-1',
              amountKcal: 500,
              note: 'Pizza',
              emotion: 'happy',
              createdAt: '2026-03-01T00:00:00.000Z',
            },
          ],
          emotion: 'happy',
          createdAt: '2026-03-01T00:00:00.000Z',
          updatedAt: '2026-03-01T00:00:00.000Z',
        },
      ],
    }

    const upgraded = parseExportBundle(v3Bundle)

    expect(upgraded.version).toBe(6)
    const group = upgraded.dailyEntries[0].calorieEntries?.[0]
    // Old-format meal emotion is cleared, not translated (#54) — and never
    // reaches the item either, since the v3 path drops it before folding.
    expect(group?.items[0].emotion).toBeUndefined()
    expect(group?.items[0].name).toBe('Pizza')
    expect(group?.items[0].amountKcal).toBe(500)
    // Day-level emotion is untouched — that set didn't change.
    expect(upgraded.dailyEntries[0].emotion).toBe('happy')
  })

  it('upgrades a legacy v2 backup (single caloriesConsumed number) into a single-item group', () => {
    const legacyBundle = {
      version: 2,
      exportedAt: '2026-01-01',
      goals: [],
      dailyEntries: [
        {
          id: 'entry-1',
          date: '2026-03-01',
          weightKg: 80,
          caloriesConsumed: 1600,
          createdAt: '2026-03-01T00:00:00.000Z',
          updatedAt: '2026-03-01T00:00:00.000Z',
        },
      ],
    }

    const upgraded = parseExportBundle(legacyBundle)

    expect(upgraded.version).toBe(6)
    expect(upgraded.dailyEntries[0]).not.toHaveProperty('caloriesConsumed')
    const group = upgraded.dailyEntries[0].calorieEntries?.[0]
    expect(group?.items).toEqual([
      {
        id: expect.any(String),
        name: undefined,
        amountKcal: 1600,
        proteinG: undefined,
        fatG: undefined,
        carbsG: undefined,
      },
    ])
  })

  it('upgrades a legacy v2 entry with no calories logged, leaving calorieEntries undefined', () => {
    const legacyBundle = {
      version: 2,
      exportedAt: '2026-01-01',
      goals: [],
      dailyEntries: [
        {
          id: 'entry-1',
          date: '2026-03-01',
          weightKg: 80,
          createdAt: '2026-03-01T00:00:00.000Z',
          updatedAt: '2026-03-01T00:00:00.000Z',
        },
      ],
    }

    const upgraded = parseExportBundle(legacyBundle)

    expect(upgraded.dailyEntries[0].calorieEntries).toBeUndefined()
  })

  it('throws InvalidBackupFileError for malformed JSON content', () => {
    expect(() => parseExportBundle({ not: 'a backup' })).toThrow(
      InvalidBackupFileError,
    )
  })
})
