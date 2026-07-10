import {
  IndexedDbDailyEntryRepository,
  IndexedDbGoalRepository,
} from '@/infrastructure/persistence/indexeddb'
import { buildExportBundle } from './exportBundle'
import { exportBundleSchema, type ExportBundle } from './exportBundleSchema'

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
  const result = exportBundleSchema.safeParse(raw)
  if (!result.success) {
    throw new InvalidBackupFileError(
      "This file doesn't look like a valid Turtle Steps backup.",
    )
  }
  return result.data
}
