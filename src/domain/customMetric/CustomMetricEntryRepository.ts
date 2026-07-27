import type { CustomMetricEntry } from './CustomMetric'

export interface CustomMetricEntryRepository {
  getAll(): Promise<CustomMetricEntry[]>
  getByMetric(metricId: string): Promise<CustomMetricEntry[]>
  /** Callers use this to find the existing row's own id before upserting
   * (same "look up the existing id, carry it over" pattern
   * `IndexedDbDailyEntryRepository.getByDate` already establishes for its
   * own `&date` unique index) — `upsert` itself is a plain `put`, it
   * doesn't do find-or-create. */
  getByMetricAndDate(
    metricId: string,
    date: string,
  ): Promise<CustomMetricEntry | undefined>
  upsert(entry: CustomMetricEntry): Promise<void>
  delete(id: string): Promise<void>
  /** Cascades a metric's own deletion (`useCustomMetricStore.deleteMetric`)
   * — an entry with no surviving metric to belong to is just orphaned
   * data, not a record worth keeping around. */
  deleteByMetric(metricId: string): Promise<void>
}
