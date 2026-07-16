import {
  IndexedDbDailyEntryRepository,
  IndexedDbGoalRepository,
} from '@/infrastructure/persistence/indexeddb'
import { buildExportBundle } from './exportBundle'
import {
  exportBundleSchema,
  exportBundleSchemaV2,
  exportBundleSchemaV3,
  exportBundleSchemaV4,
  type ExportBundle,
  type ExportBundleV4,
} from './exportBundleSchema'

const goalRepository = new IndexedDbGoalRepository()
const dailyEntryRepository = new IndexedDbDailyEntryRepository()

export async function exportAllData(): Promise<ExportBundle> {
  const [goals, dailyEntries] = await Promise.all([
    goalRepository.getAll(),
    dailyEntryRepository.getAll(),
  ])
  return buildExportBundle(goals, dailyEntries)
}

/** Merges a backup into existing data (upsert by id) rather than replacing it. */
export async function importAllData(bundle: ExportBundle): Promise<void> {
  await Promise.all([
    ...bundle.goals.map((goal) => goalRepository.saveGoal(goal)),
    ...bundle.dailyEntries.map((entry) => dailyEntryRepository.upsert(entry)),
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
): ExportBundle['dailyEntries'] {
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

export function parseExportBundle(raw: unknown): ExportBundle {
  const current = exportBundleSchema.safeParse(raw)
  if (current.success) return current.data

  const v4 = exportBundleSchemaV4.safeParse(raw)
  if (v4.success) {
    return {
      ...v4.data,
      version: 5,
      dailyEntries: foldFlatMealsIntoGroups(v4.data.dailyEntries),
    }
  }

  // v3 -> v5: meal-level emotion used the day's happy/unhappy/neutral set.
  // No auto-mapping to thumbsUp/thumbsDown/bellissimo (decided when #54 was
  // scoped) — old meal emotions are cleared, not translated. Then folded
  // into single-item groups same as the v4 path above.
  const v3 = exportBundleSchemaV3.safeParse(raw)
  if (v3.success) {
    return {
      ...v3.data,
      version: 5,
      dailyEntries: foldFlatMealsIntoGroups(
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
    }
  }

  const legacy = exportBundleSchemaV2.safeParse(raw)
  if (legacy.success) {
    return {
      ...legacy.data,
      version: 5,
      dailyEntries: foldFlatMealsIntoGroups(
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
    }
  }

  throw new InvalidBackupFileError(
    "This file doesn't look like a valid Turtle Steps backup.",
  )
}
