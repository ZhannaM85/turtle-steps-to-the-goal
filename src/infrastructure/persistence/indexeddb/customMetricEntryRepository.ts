import type {
  CustomMetricEntry,
  CustomMetricEntryRepository,
} from '@/domain/customMetric'
import { db } from './db'

export class IndexedDbCustomMetricEntryRepository
  implements CustomMetricEntryRepository
{
  async getAll(): Promise<CustomMetricEntry[]> {
    return db.customMetricEntries.toArray()
  }

  async getByMetric(metricId: string): Promise<CustomMetricEntry[]> {
    return db.customMetricEntries.where('metricId').equals(metricId).toArray()
  }

  async getByMetricAndDate(
    metricId: string,
    date: string,
  ): Promise<CustomMetricEntry | undefined> {
    return db.customMetricEntries
      .where('[metricId+date]')
      .equals([metricId, date])
      .first()
  }

  async upsert(entry: CustomMetricEntry): Promise<void> {
    await db.customMetricEntries.put(entry)
  }

  async delete(id: string): Promise<void> {
    await db.customMetricEntries.delete(id)
  }

  async deleteByMetric(metricId: string): Promise<void> {
    await db.customMetricEntries.where('metricId').equals(metricId).delete()
  }
}
