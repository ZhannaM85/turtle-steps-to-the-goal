import {
  IndexedDbCustomCorrelationRepository,
  IndexedDbCustomMetricEntryRepository,
  IndexedDbCustomMetricRepository,
  IndexedDbDailyEntryRepository,
  IndexedDbFoodOverrideRepository,
  IndexedDbGoalRepository,
  IndexedDbMealItemRepository,
  IndexedDbPlannedMealRepository,
  IndexedDbRecipeRepository,
  IndexedDbWeeklyNoteRepository,
} from '@/infrastructure/persistence/indexeddb'
import { useLocaleStore } from '@/i18n'
import { useThemeStore } from '@/stores/themeStore'
import { buildExportBundle } from './exportBundle'
import {
  exportBundleSchema,
  exportBundleSchemaV2,
  exportBundleSchemaV3,
  exportBundleSchemaV4,
  exportBundleSchemaV5,
  exportBundleSchemaV6,
  exportBundleSchemaV7,
  exportBundleSchemaV8,
  exportBundleSchemaV9,
  type ExportBundle,
  type ExportBundleV4,
  type ExportBundleV5,
  type ExportBundleV6,
} from './exportBundleSchema'
import {
  applyAppearanceAndLocale,
  applySettingsPreferences,
  collectSettingsPreferences,
} from './settingsPreferences'

const goalRepository = new IndexedDbGoalRepository()
const dailyEntryRepository = new IndexedDbDailyEntryRepository()
const mealItemRepository = new IndexedDbMealItemRepository()
const foodOverrideRepository = new IndexedDbFoodOverrideRepository()
const recipeRepository = new IndexedDbRecipeRepository()
const customMetricRepository = new IndexedDbCustomMetricRepository()
const customMetricEntryRepository = new IndexedDbCustomMetricEntryRepository()
const customCorrelationRepository = new IndexedDbCustomCorrelationRepository()
const weeklyNoteRepository = new IndexedDbWeeklyNoteRepository()
const plannedMealRepository = new IndexedDbPlannedMealRepository()

export async function exportAllData(): Promise<ExportBundle> {
  const [
    goals,
    dailyEntries,
    mealItems,
    foodOverrides,
    recipes,
    customMetrics,
    customMetricEntries,
    customCorrelations,
    weeklyNotes,
    plannedMeals,
  ] = await Promise.all([
    goalRepository.getAll(),
    dailyEntryRepository.getAll(),
    mealItemRepository.getAll(),
    foodOverrideRepository.getAll(),
    recipeRepository.getAll(),
    customMetricRepository.getAll(),
    customMetricEntryRepository.getAll(),
    customCorrelationRepository.getAll(),
    weeklyNoteRepository.getAll(),
    plannedMealRepository.getAll(),
  ])
  const theme = useThemeStore.getState()
  return buildExportBundle(
    goals,
    dailyEntries,
    mealItems,
    foodOverrides,
    recipes,
    customMetrics,
    customMetricEntries,
    customCorrelations,
    weeklyNotes,
    plannedMeals,
    { mood: theme.mood, colorScheme: theme.colorScheme },
    useLocaleStore.getState().locale,
    collectSettingsPreferences(),
  )
}

/**
 * Merges a backup into existing data rather than replacing it — matching
 * entries are updated by date/name (the app's own user-facing copy for
 * this button), everything else is left alone.
 *
 * #207: `dailyEntries`/`mealItems` each have a *unique* secondary index
 * (`date`/`name`, `db.ts`) that their own `upsert()` deliberately enforces
 * as a hard guarantee (`index.test.ts`'s "enforces one entry per
 * date"/"enforces unique names") — every other caller resolves to the
 * *existing* record's own id before upserting (`mealItemStore.touch()`/
 * `rename()`, both save flows on Today/History), so it never fires
 * outside import. A re-imported backup carries its own ids though, which
 * essentially never match whatever this device generated for the same
 * date/name since the backup was taken — so almost any real re-import hit
 * a Dexie `ConstraintError` here, surfacing as a generic, unhelpful
 * "Import failed" with nothing in the console (the error was genuinely
 * caught, not swallowed silently). Looking up the existing id first and
 * carrying it over onto the imported record (rather than leaving the
 * import's own id, which would still collide) fixes this the same way
 * every other caller already avoids it.
 */
export async function importAllData(bundle: ExportBundle): Promise<void> {
  const [existingEntries, existingMealItems] = await Promise.all([
    dailyEntryRepository.getAll(),
    mealItemRepository.getAll(),
  ])
  const existingEntryByDate = new Map(
    existingEntries.map((entry) => [entry.date, entry]),
  )
  const existingMealItemIdByName = new Map(
    existingMealItems.map((item) => [item.name, item.id]),
  )

  await Promise.all([
    ...bundle.goals.map((goal) => goalRepository.saveGoal(goal)),
    ...bundle.dailyEntries.map((entry) => {
      // #628 — spread `existing` first: a field genuinely absent from the
      // imported entry (an older/partial backup) then survives instead of
      // silently being wiped by a plain `{ ...entry, id: existingId }`
      // full-record replace. `JSON.stringify` never emits an explicit
      // `undefined`-valued key, so this can't accidentally let an
      // imported "cleared" field lose to a stale existing one — every key
      // `entry` actually carries still wins/updates as before.
      const existing = existingEntryByDate.get(entry.date)
      return dailyEntryRepository.upsert(
        existing ? { ...existing, ...entry, id: existing.id } : entry,
      )
    }),
    ...(bundle.mealItems ?? []).map((item) => {
      const existingId = existingMealItemIdByName.get(item.name)
      return mealItemRepository.upsert(
        existingId ? { ...item, id: existingId } : item,
      )
    }),
    ...(bundle.foodOverrides ?? []).map((override) =>
      foodOverrideRepository.upsert(override),
    ),
    // Recipes have no unique-name index (unlike mealItems/dailyEntries) —
    // just id, which the export already carries stably from creation, so
    // there's no ConstraintError risk to guard against here.
    ...(bundle.recipes ?? []).map((recipe) => recipeRepository.upsert(recipe)),
    // #336 — same "no unique index beyond id" reasoning as recipes above,
    // for all three of these.
    ...(bundle.customMetrics ?? []).map((metric) =>
      customMetricRepository.upsert(metric),
    ),
    // customMetricEntries has a unique `&[metricId+date]` index (db.ts) —
    // same ConstraintError risk #207 already fixed for dailyEntries/
    // mealItems, since an imported entry's own id almost never matches
    // whatever this device already generated for the same metric+date.
    // Looking up the existing id first and carrying it over avoids it,
    // same as those two callers above already do.
    ...(bundle.customMetricEntries ?? []).map(async (entry) => {
      const existing = await customMetricEntryRepository.getByMetricAndDate(
        entry.metricId,
        entry.date,
      )
      return customMetricEntryRepository.upsert(
        existing ? { ...entry, id: existing.id } : entry,
      )
    }),
    ...(bundle.customCorrelations ?? []).map((correlation) =>
      customCorrelationRepository.upsert(correlation),
    ),
    ...(bundle.weeklyNotes ?? []).map((note) =>
      weeklyNoteRepository.upsert(note),
    ),
    // #614 — no unique secondary index beyond id (`db.ts`: `id, date`),
    // same "no ConstraintError risk" reasoning as recipes/customMetrics/
    // customCorrelations above.
    ...(bundle.plannedMeals ?? []).map((plannedMeal) =>
      plannedMealRepository.upsert(plannedMeal),
    ),
  ])

  // #578 / #594 — apply UI prefs after domain data. Omitted fields /
  // older backups leave the device's current prefs alone.
  applyAppearanceAndLocale(bundle.appearance, bundle.locale)
  applySettingsPreferences(bundle.settings)
}

export class InvalidBackupFileError extends Error {}

/**
 * v4 -> v5 (#81): each flat meal (single kcal/macro record) becomes a
 * single-item group — the old `note` was already doing double duty as the
 * dish name, so it becomes the item's `name`; the group's own `note` is
 * cleared since that meaning fully transfers to the item. Shared by the
 * v4 path directly and by the older v3/v2 paths below, once they've
 * upgraded that far themselves.
 */
function foldFlatMealsIntoGroups(
  dailyEntries: ExportBundleV4['dailyEntries'],
): ExportBundleV5['dailyEntries'] {
  return dailyEntries.map((entry) => ({
    ...entry,
    calorieEntries: entry.calorieEntries?.map((meal) => ({
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
    })),
  }))
}

/**
 * v5 -> v6 (#129): a meal's reaction moves from the group (CalorieEntry.
 * emotion) onto each item. Only unambiguous for a single-item meal, where
 * the old group reaction clearly belonged to that one dish — multi-item
 * meals had no way to know which dish it was about, so that data is
 * simply dropped (same reasoning #54's v3->v4 clear used for the older
 * happy/unhappy/neutral meal-emotion set).
 */
function upgradeV5ToV6(
  dailyEntries: ExportBundleV5['dailyEntries'],
): ExportBundleV6['dailyEntries'] {
  return dailyEntries.map((entry) => ({
    ...entry,
    calorieEntries: entry.calorieEntries?.map(
      ({ emotion, ...meal }) =>
        emotion && meal.items.length === 1
          ? { ...meal, items: [{ ...meal.items[0], emotion }] }
          : meal,
    ),
  }))
}

/**
 * v6 -> v7 (#271): water logging moves from a single running `waterMl`
 * total to a list of discrete `waterEntries`. Buckets whatever total was
 * already logged into one legacy entry rather than dropping it — same
 * "scalar becomes a single-item list" shape `foldFlatMealsIntoGroups`
 * already used for v4 -> v5's caloriesConsumed -> calorieEntries move.
 */
function upgradeV6ToV7(
  dailyEntries: ExportBundleV6['dailyEntries'],
): ExportBundle['dailyEntries'] {
  return dailyEntries.map(({ waterMl, ...entry }) => ({
    ...entry,
    waterEntries:
      waterMl === undefined
        ? undefined
        : [{ id: crypto.randomUUID(), amountMl: waterMl }],
  }))
}

export function parseExportBundle(raw: unknown): ExportBundle {
  const current = exportBundleSchema.safeParse(raw)
  if (current.success) return current.data

  // v9 -> v10 (#594): Settings prefs blob added (unset when upgrading).
  const v9 = exportBundleSchemaV9.safeParse(raw)
  if (v9.success) {
    return {
      ...v9.data,
      version: 10,
    }
  }

  // v8 -> v10 (#578): appearance + locale UI prefs added (unset when upgrading).
  const v8 = exportBundleSchemaV8.safeParse(raw)
  if (v8.success) {
    return {
      ...v8.data,
      version: 10,
    }
  }

  // v7 -> v8 (#557): weekly notes table added (empty when upgrading).
  const v7 = exportBundleSchemaV7.safeParse(raw)
  if (v7.success) {
    return {
      ...v7.data,
      version: 10,
      weeklyNotes: [],
    }
  }

  // v6 -> v7 (#271): a single waterMl total becomes a list of entries.
  const v6 = exportBundleSchemaV6.safeParse(raw)
  if (v6.success) {
    return {
      ...v6.data,
      version: 10,
      dailyEntries: upgradeV6ToV7(v6.data.dailyEntries),
      weeklyNotes: [],
    }
  }

  // v5 -> v6 (#129): a meal's reaction moves from the group onto each item.
  const v5 = exportBundleSchemaV5.safeParse(raw)
  if (v5.success) {
    return {
      ...v5.data,
      version: 10,
      dailyEntries: upgradeV6ToV7(upgradeV5ToV6(v5.data.dailyEntries)),
      weeklyNotes: [],
    }
  }

  const v4 = exportBundleSchemaV4.safeParse(raw)
  if (v4.success) {
    return {
      ...v4.data,
      version: 10,
      dailyEntries: upgradeV6ToV7(
        upgradeV5ToV6(foldFlatMealsIntoGroups(v4.data.dailyEntries)),
      ),
      weeklyNotes: [],
    }
  }

  // v3 -> v5: meal-level emotion used the day's happy/unhappy/neutral set.
  // No auto-mapping to thumbsUp/thumbsDown/bellissimo (decided when #54 was
  // scoped) — old meal emotions are cleared, not translated. Then folded
  // into single-item groups same as the v4 path above, then on to v10.
  const v3 = exportBundleSchemaV3.safeParse(raw)
  if (v3.success) {
    return {
      ...v3.data,
      version: 10,
      dailyEntries: upgradeV6ToV7(
        upgradeV5ToV6(
          foldFlatMealsIntoGroups(
            v3.data.dailyEntries.map((entry) => ({
              ...entry,
              calorieEntries: entry.calorieEntries?.map((meal) => ({
                id: meal.id,
                amountKcal: meal.amountKcal,
                note: meal.note,
                createdAt: meal.createdAt,
              })),
            })),
          ),
        ),
      ),
      weeklyNotes: [],
    }
  }

  const legacy = exportBundleSchemaV2.safeParse(raw)
  if (legacy.success) {
    return {
      ...legacy.data,
      version: 10,
      dailyEntries: upgradeV6ToV7(
        upgradeV5ToV6(
          foldFlatMealsIntoGroups(
            legacy.data.dailyEntries.map(({ caloriesConsumed, ...entry }) => ({
              ...entry,
              calorieEntries:
                caloriesConsumed === undefined
                  ? undefined
                  : [
                      {
                        id: crypto.randomUUID(),
                        amountKcal: caloriesConsumed,
                        createdAt: entry.createdAt,
                      },
                    ],
            })),
          ),
        ),
      ),
      weeklyNotes: [],
    }
  }

  throw new InvalidBackupFileError(
    "This file doesn't look like a valid Turtle Steps backup.",
  )
}
