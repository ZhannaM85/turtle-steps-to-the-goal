import type { CustomMetric } from './CustomMetric'

export interface CustomMetricRepository {
  getAll(): Promise<CustomMetric[]>
  upsert(metric: CustomMetric): Promise<void>
  delete(id: string): Promise<void>
}
