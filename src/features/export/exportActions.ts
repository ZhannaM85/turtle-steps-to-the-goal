import {
  IndexedDbDailyEntryRepository,
  IndexedDbFoodOverrideRepository,
  IndexedDbGoalRepository,
  IndexedDbMealItemRepository,
} from '@/infrastructure/persistence/indexeddb'
import { buildExportBundle } from './exportBundle'
import {
  exportBundleSchema,
  exportBundleSchemaV2,
  exportBundleSchemaV3,
  exportBundleSchemaV4,
  exportBundleSchemaV5,
  type ExportBundle,
  type ExportBundleV4,
  type ExportBundleV5,
} from './exportBundleSchema'

const goalRepository = new IndexedDbGoalRepository()
const dailyEntryRepository = new IndexedDbDailyEntryRepository()
const mealItemRepository = new IndexedDbMealItemRepository()
const foodOverrideRepository = new IndexedDbFoodOverrideRepository()

export async function exportAllData(): Promise<ExportBundle> {
  const [goals, dailyEntries, mealItems, foodOverrides] = await Promise.all([
    goalRepository.getAll(),
    dailyEntryRepository.getAll(),
    mealItemRepository.getAll(),
    foodOverrideRepository.getAll(),
  ])
  return buildExportBundle(goals, dailyEntries, mealItems, foodOverrides)
}

/** Merges a backup into existing data (upsert by id) rather than replacing it.
 * mealItems/foodOverrides (#113) are optional — older backups won't have
 * them, in which case there's simply nothing to import for those. */
export async function importAllData(bundle: ExportBundle): Promise<void> {
  await Promise.all([
    ...bundle.goals.map((goal) => goalRepository.saveGoal(goal)),
    ...bundle.dailyEntries.map((entry) => dailyEntryRepository.upsert(entry)),
    ...(bundle.mealItems ?? []).map((item) => mealItemRepository.upsert(item)),
    ...(bundle.foodOverrides ?? []).map((override) =>
      foodOverrideRepository.upsert(override),
    ),
  ])
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
): ExportBundle['dailyEntries'] {
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

export function parseExportBundle(raw: unknown): ExportBundle {
  const current = exportBundleSchema.safeParse(raw)
  if (current.success) return current.data

  // v5 -> v6 (#129): a meal's reaction moves from the group onto each item.
  const v5 = exportBundleSchemaV5.safeParse(raw)
  if (v5.success) {
    return {
      ...v5.data,
      version: 6,
      dailyEntries: upgradeV5ToV6(v5.data.dailyEntries),
    }
  }

  const v4 = exportBundleSchemaV4.safeParse(raw)
  if (v4.success) {
    return {
      ...v4.data,
      version: 6,
      dailyEntries: upgradeV5ToV6(foldFlatMealsIntoGroups(v4.data.dailyEntries)),
    }
  }

  // v3 -> v5: meal-level emotion used the day's happy/unhappy/neutral set.
  // No auto-mapping to thumbsUp/thumbsDown/bellissimo (decided when #54 was
  // scoped) — old meal emotions are cleared, not translated. Then folded
  // into single-item groups same as the v4 path above, then on to v6.
  const v3 = exportBundleSchemaV3.safeParse(raw)
  if (v3.success) {
    return {
      ...v3.data,
      version: 6,
      dailyEntries: upgradeV5ToV6(
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
    }
  }

  const legacy = exportBundleSchemaV2.safeParse(raw)
  if (legacy.success) {
    return {
      ...legacy.data,
      version: 6,
      dailyEntries: upgradeV5ToV6(
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
    }
  }

  throw new InvalidBackupFileError(
    "This file doesn't look like a valid Turtle Steps backup.",
  )
}
