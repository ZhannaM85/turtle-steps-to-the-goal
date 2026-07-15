import {
  IndexedDbDailyEntryRepository,
  IndexedDbGoalRepository,
} from '@/infrastructure/persistence/indexeddb'
import { buildExportBundle } from './exportBundle'
import {
  exportBundleSchema,
  exportBundleSchemaV2,
  exportBundleSchemaV3,
  type ExportBundle,
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

export function parseExportBundle(raw: unknown): ExportBundle {
  const current = exportBundleSchema.safeParse(raw)
  if (current.success) return current.data

  // v3 -> v4 (#54): meal-level emotion used the day's happy/unhappy/neutral
  // set. No auto-mapping to thumbsUp/thumbsDown/bellissimo (decided when
  // #54 was scoped) — old meal emotions are cleared, not translated.
  const v3 = exportBundleSchemaV3.safeParse(raw)
  if (v3.success) {
    return {
      ...v3.data,
      version: 4,
      dailyEntries: v3.data.dailyEntries.map((entry) => ({
        ...entry,
        calorieEntries: entry.calorieEntries?.map((meal) => ({
          id: meal.id,
          amountKcal: meal.amountKcal,
          note: meal.note,
          createdAt: meal.createdAt,
        })),
      })),
    }
  }

  const legacy = exportBundleSchemaV2.safeParse(raw)
  if (legacy.success) {
    return {
      ...legacy.data,
      version: 4,
      dailyEntries: legacy.data.dailyEntries.map(
        ({ caloriesConsumed, ...entry }) => ({
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
        }),
      ),
    }
  }

  throw new InvalidBackupFileError(
    "This file doesn't look like a valid Turtle Steps backup.",
  )
}
