import {
  IndexedDbDailyEntryRepository,
  IndexedDbGoalRepository,
} from '@/infrastructure/persistence/indexeddb'
import { buildExportBundle } from './exportBundle'
import {
  exportBundleSchema,
  exportBundleSchemaV2,
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

  const legacy = exportBundleSchemaV2.safeParse(raw)
  if (legacy.success) {
    return {
      ...legacy.data,
      version: 3,
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
