import type {
  CustomCorrelation,
  CustomCorrelationRepository,
} from '@/domain/customMetric'
import { db } from './db'

export class IndexedDbCustomCorrelationRepository
  implements CustomCorrelationRepository
{
  async getAll(): Promise<CustomCorrelation[]> {
    return (await db.customCorrelations.toArray()).sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt),
    )
  }

  async upsert(correlation: CustomCorrelation): Promise<void> {
    await db.customCorrelations.put(correlation)
  }

  async delete(id: string): Promise<void> {
    await db.customCorrelations.delete(id)
  }
}
