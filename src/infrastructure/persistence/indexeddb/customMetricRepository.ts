import type { CustomMetric, CustomMetricRepository } from '@/domain/customMetric'
import { db } from './db'

export class IndexedDbCustomMetricRepository implements CustomMetricRepository {
  async getAll(): Promise<CustomMetric[]> {
    return (await db.customMetrics.toArray()).sort((a, b) =>
      a.name.localeCompare(b.name),
    )
  }

  async upsert(metric: CustomMetric): Promise<void> {
    await db.customMetrics.put(metric)
  }

  async delete(id: string): Promise<void> {
    await db.customMetrics.delete(id)
  }
}
