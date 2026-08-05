import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import type { FoodOverride } from '@/domain/foodOverride'
import type { Goal } from '@/domain/goal'
import type { MealItem } from '@/domain/mealItem'
import type { Recipe } from '@/domain/recipe'
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

beforeEach(async () => {
  await db.goals.clear()
  await db.dailyEntries.clear()
  await db.mealItems.clear()
  await db.foodOverrides.clear()
  await db.recipes.clear()
})

afterEach(async () => {
  await db.goals.clear()
  await db.dailyEntries.clear()
  await db.mealItems.clear()
  await db.foodOverrides.clear()
  await db.recipes.clear()
})

describe('exportAllData', () => {
  it('exports an empty bundle when there is no data', async () => {
    const bundle = await exportAllData()
    expect(bundle.goals).toEqual([])
    expect(bundle.dailyEntries).toEqual([])
  })

  it('includes current appearance and language in the backup (#578)', async () => {
    const { useThemeStore } = await import('@/stores/themeStore')
    const { useLocaleStore } = await import('@/i18n')
    useThemeStore.setState({ mood: 'sage', colorScheme: 'dark' })
    useLocaleStore.setState({ locale: 'ru' })

    const bundle = await exportAllData()
    expect(bundle.appearance).toEqual({ mood: 'sage', colorScheme: 'dark' })
    expect(bundle.locale).toBe('ru')
  })

  it('includes Settings page preferences in the backup (#594)', async () => {
    const { useUnitStore } = await import('@/stores/unitStore')
    const { useProfileStore } = await import('@/stores/profileStore')
    const { useDayStartStore } = await import('@/stores/dayStartStore')
    const { useMealLabelPresetStore } = await import(
      '@/stores/mealLabelPresetStore'
    )
    useUnitStore.setState({ unit: 'lb' })
    useDayStartStore.setState({ dayStartTime: '05:30' })
    useProfileStore.setState({
      heightCm: 170,
      age: 35,
      sex: 'male',
      activityLevel: 'moderate',
    })
    useMealLabelPresetStore.setState({ presets: ['Second breakfast'] })

    const bundle = await exportAllData()
    expect(bundle.settings?.unit).toBe('lb')
    expect(bundle.settings?.dayStartTime).toBe('05:30')
    expect(bundle.settings?.profile).toMatchObject({
      heightCm: 170,
      age: 35,
      sex: 'male',
      activityLevel: 'moderate',
    })
    expect(bundle.settings?.mealLabelPresets).toEqual(['Second breakfast'])
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

  it('round-trips the optional daily protein target through parseExportBundle too (#220)', async () => {
    const goal = makeGoal({ dailyProteinTargetG: 120 })
    await db.goals.put(goal)
    const bundle = await exportAllData()

    await db.goals.clear()

    const parsed = parseExportBundle(JSON.parse(JSON.stringify(bundle)))
    await importAllData(parsed)

    const all = await db.goals.toArray()
    expect(all[0].dailyProteinTargetG).toBe(120)
  })

  it('round-trips body measurements through parseExportBundle too (#225)', async () => {
    const entry = makeEntry({ waistCm: 80, hipCm: 95, bodyFatPercent: 22 })
    await db.dailyEntries.put(entry)
    const bundle = await exportAllData()

    await db.dailyEntries.clear()

    const parsed = parseExportBundle(JSON.parse(JSON.stringify(bundle)))
    await importAllData(parsed)

    const all = await db.dailyEntries.toArray()
    expect(all[0].waistCm).toBe(80)
    expect(all[0].hipCm).toBe(95)
    expect(all[0].bodyFatPercent).toBe(22)
  })

  it('merges into existing data instead of wiping it', async () => {
    const existingEntry = makeEntry({ date: '2026-03-02' })
    await db.dailyEntries.put(existingEntry)

    const backupEntry = makeEntry({ date: '2026-03-01' })
    await importAllData({
      version: 10,
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
      version: 10,
      exportedAt: new Date().toISOString(),
      goals: [],
      dailyEntries: [backupEntry],
    })

    const all = await db.dailyEntries.toArray()
    expect(all).toHaveLength(1)
    expect(all[0].weightKg).toBe(81)
  })

  // #628 — reported live: a day's weight showed up in a correlation view
  // (which averages across a whole week) but was empty when the actual
  // day was opened. Root cause: this merge only ever spread the *imported*
  // entry's own fields (`{ ...entry, id: existingId }`), never the existing
  // record's — so re-importing an older/partial backup (missing a field
  // the existing entry already had) silently wiped that field, directly
  // contradicting `t.export.importBlurb`'s own "nothing is deleted"
  // promise. `note` (present on both) still gets a real update from the
  // import to confirm this isn't a blanket "existing always wins" — only
  // fields genuinely absent from the incoming entry are preserved.
  it('preserves an existing field the imported entry does not carry, instead of wiping it (#628)', async () => {
    const existingEntry = makeEntry({
      id: 'local-id',
      date: '2026-03-01',
      weightKg: 80,
      note: 'old note',
    })
    await db.dailyEntries.put(existingEntry)

    // Built directly (not via `makeEntry`, which always sets `weightKg`) so
    // the key is genuinely absent — matching a real `JSON.parse`'d backup,
    // which never has explicit `undefined`-valued keys either.
    const backupEntryWithoutWeight: DailyEntry = {
      id: 'backup-id',
      date: '2026-03-01',
      note: 'updated note',
      createdAt: existingEntry.createdAt,
      updatedAt: existingEntry.createdAt,
    }
    await importAllData({
      version: 10,
      exportedAt: new Date().toISOString(),
      goals: [],
      dailyEntries: [backupEntryWithoutWeight],
    })

    const all = await db.dailyEntries.toArray()
    expect(all).toHaveLength(1)
    expect(all[0].weightKg).toBe(80)
    expect(all[0].note).toBe('updated note')
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
      version: 10,
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

  it('round-trips MealItem.favorite/barcode and FoodOverride.favorite (#284)', async () => {
    const item = makeMealItem({ favorite: true, barcode: '0123456789012' })
    const override = makeFoodOverride({ favorite: true })
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
        version: 10,
        exportedAt: new Date().toISOString(),
        goals: [],
        dailyEntries: [],
      }),
    ).resolves.not.toThrow()

    expect(await db.mealItems.toArray()).toEqual([])
    expect(await db.foodOverrides.toArray()).toEqual([])
  })

  it('round-trips recipes (#251)', async () => {
    const recipe = makeRecipe({
      name: 'Chili',
      ingredients: [
        { id: crypto.randomUUID(), name: 'Ground beef', amountKcal: 800 },
      ],
      servings: 4,
    })
    await db.recipes.put(recipe)
    const bundle = await exportAllData()

    await db.recipes.clear()
    await importAllData(bundle)

    expect(await db.recipes.toArray()).toEqual([recipe])
  })

  it('imports fine when recipes is absent (older backups, #251)', async () => {
    await expect(
      importAllData({
        version: 10,
        exportedAt: new Date().toISOString(),
        goals: [],
        dailyEntries: [],
      }),
    ).resolves.not.toThrow()

    expect(await db.recipes.toArray()).toEqual([])
  })

  it('restores appearance and language from the backup (#578)', async () => {
    const { useThemeStore } = await import('@/stores/themeStore')
    const { useLocaleStore } = await import('@/i18n')
    useThemeStore.setState({ mood: 'pond', colorScheme: 'system' })
    useLocaleStore.setState({ locale: 'en' })

    await importAllData({
      version: 10,
      exportedAt: new Date().toISOString(),
      goals: [],
      dailyEntries: [],
      appearance: { mood: 'lagoon', colorScheme: 'light' },
      locale: 'ru',
    })

    expect(useThemeStore.getState().mood).toBe('lagoon')
    expect(useThemeStore.getState().colorScheme).toBe('light')
    expect(useLocaleStore.getState().locale).toBe('ru')
  })

  it('restores Settings preferences from the backup (#594)', async () => {
    const { useUnitStore } = await import('@/stores/unitStore')
    const { useProfileStore } = await import('@/stores/profileStore')
    const { useTrackedFieldsStore } = await import('@/stores/trackedFieldsStore')
    const { useCycleTrackingStore } = await import('@/stores/cycleTrackingStore')
    useUnitStore.setState({ unit: 'kg' })
    useCycleTrackingStore.setState({ enabled: false })
    useProfileStore.setState({
      heightCm: undefined,
      age: undefined,
      sex: undefined,
      activityLevel: undefined,
    })
    useTrackedFieldsStore.setState((state) => ({
      tracked: { ...state.tracked, sleep: true, fiber: true },
    }))

    await importAllData({
      version: 10,
      exportedAt: new Date().toISOString(),
      goals: [],
      dailyEntries: [],
      settings: {
        unit: 'lb',
        cycleTracking: true,
        trackedFields: { sleep: false, fiber: false },
        profile: {
          heightCm: 160,
          age: 28,
          sex: 'female',
          activityLevel: 'light',
        },
        mealLabelPresets: ['Tea'],
      },
    })

    expect(useUnitStore.getState().unit).toBe('lb')
    expect(useCycleTrackingStore.getState().enabled).toBe(true)
    expect(useTrackedFieldsStore.getState().tracked.sleep).toBe(false)
    expect(useTrackedFieldsStore.getState().tracked.fiber).toBe(false)
    expect(useProfileStore.getState()).toMatchObject({
      heightCm: 160,
      age: 28,
      sex: 'female',
      activityLevel: 'light',
    })
    const { useMealLabelPresetStore } = await import(
      '@/stores/mealLabelPresetStore'
    )
    expect(useMealLabelPresetStore.getState().presets).toEqual(['Tea'])
  })

  it('leaves Settings preferences alone when a pre-v10 backup omits them (#594)', async () => {
    const { useUnitStore } = await import('@/stores/unitStore')
    const { useProfileStore } = await import('@/stores/profileStore')
    useUnitStore.setState({ unit: 'lb' })
    useProfileStore.setState({
      heightCm: 180,
      age: 50,
      sex: 'male',
      activityLevel: 'active',
    })

    await importAllData({
      version: 10,
      exportedAt: new Date().toISOString(),
      goals: [],
      dailyEntries: [],
    })

    expect(useUnitStore.getState().unit).toBe('lb')
    expect(useProfileStore.getState().heightCm).toBe(180)
  })

  it('leaves appearance and language alone when a pre-v9 backup omits them (#578)', async () => {
    const { useThemeStore } = await import('@/stores/themeStore')
    const { useLocaleStore } = await import('@/i18n')
    useThemeStore.setState({ mood: 'dusk', colorScheme: 'dark' })
    useLocaleStore.setState({ locale: 'ru' })

    await importAllData({
      version: 10,
      exportedAt: new Date().toISOString(),
      goals: [],
      dailyEntries: [],
    })

    expect(useThemeStore.getState().mood).toBe('dusk')
    expect(useThemeStore.getState().colorScheme).toBe('dark')
    expect(useLocaleStore.getState().locale).toBe('ru')
  })
})

describe('parseExportBundle', () => {
  it('parses a valid v10 bundle', () => {
    const bundle = {
      version: 10,
      exportedAt: '2026-01-01',
      goals: [],
      dailyEntries: [],
    }
    expect(parseExportBundle(bundle)).toEqual(bundle)
  })

  it('upgrades a v9 backup leaving settings unset (#594)', () => {
    const v9Bundle = {
      version: 9,
      exportedAt: '2026-01-01',
      goals: [],
      dailyEntries: [],
      appearance: { mood: 'pond' as const, colorScheme: 'light' as const },
      locale: 'en' as const,
    }
    expect(parseExportBundle(v9Bundle)).toEqual({
      ...v9Bundle,
      version: 10,
    })
  })

  it('upgrades a v8 backup leaving appearance/locale unset (#578)', () => {
    const v8Bundle = {
      version: 8,
      exportedAt: '2026-01-01',
      goals: [],
      dailyEntries: [],
      weeklyNotes: [],
    }
    expect(parseExportBundle(v8Bundle)).toEqual({
      ...v8Bundle,
      version: 10,
    })
  })

  it('upgrades a v7 backup with empty weeklyNotes (#557)', () => {
    const v7Bundle = {
      version: 7,
      exportedAt: '2026-01-01',
      goals: [],
      dailyEntries: [],
    }
    expect(parseExportBundle(v7Bundle)).toEqual({
      ...v7Bundle,
      version: 10,
      weeklyNotes: [],
    })
  })

  it('upgrades a v6 backup by bucketing a single waterMl total into one entry (#271)', () => {
    const v6Bundle = {
      version: 6,
      exportedAt: '2026-01-01',
      goals: [],
      dailyEntries: [
        {
          id: 'entry-1',
          date: '2026-03-01',
          weightKg: 80,
          waterMl: 750,
          createdAt: '2026-03-01T00:00:00.000Z',
          updatedAt: '2026-03-01T00:00:00.000Z',
        },
      ],
    }

    const upgraded = parseExportBundle(v6Bundle)

    expect(upgraded.version).toBe(10)
    expect(upgraded.dailyEntries[0]).not.toHaveProperty('waterMl')
    expect(upgraded.dailyEntries[0].waterEntries).toEqual([
      { id: expect.any(String), amountMl: 750 },
    ])
  })

  it('upgrades a v6 entry with no water logged, leaving waterEntries undefined', () => {
    const v6Bundle = {
      version: 6,
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

    const upgraded = parseExportBundle(v6Bundle)

    expect(upgraded.dailyEntries[0].waterEntries).toBeUndefined()
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

    expect(upgraded.version).toBe(10)
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

    expect(upgraded.version).toBe(10)
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

    expect(upgraded.version).toBe(10)
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

    expect(upgraded.version).toBe(10)
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

  it('coerces numeric meal labels when upgrading a v8 backup (#579)', () => {
    const v8Bundle = {
      version: 8,
      exportedAt: '2026-01-01',
      goals: [],
      dailyEntries: [
        {
          id: 'entry-1',
          date: '2019-12-22',
          calorieEntries: [
            {
              id: 'meal-1',
              items: [{ id: 'item-1', amountKcal: 100 }],
              label: 4,
              createdAt: '2019-12-22T12:00:00.000Z',
            },
          ],
          createdAt: '2019-12-22T12:00:00.000Z',
          updatedAt: '2019-12-22T12:00:00.000Z',
        },
      ],
      weeklyNotes: [],
    }
    const upgraded = parseExportBundle(v8Bundle)
    expect(upgraded.version).toBe(10)
    expect(upgraded.dailyEntries[0].calorieEntries?.[0].label).toBe('4')
  })

  it('throws InvalidBackupFileError for malformed JSON content', () => {
    expect(() => parseExportBundle({ not: 'a backup' })).toThrow(
      InvalidBackupFileError,
    )
  })
})
