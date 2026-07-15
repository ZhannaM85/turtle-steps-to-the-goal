import type { DailyEntry } from '@/domain/dailyEntry'
import type { Goal } from '@/domain/goal'
import type { ExportBundle } from './exportBundleSchema'

export function buildExportBundle(
  goals: Goal[],
  dailyEntries: DailyEntry[],
): ExportBundle {
  return {
    version: 4,
    exportedAt: new Date().toISOString(),
    goals,
    dailyEntries,
  }
}
