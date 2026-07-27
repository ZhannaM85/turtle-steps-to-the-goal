import type { CustomCorrelation } from './CustomCorrelation'

export interface CustomCorrelationRepository {
  getAll(): Promise<CustomCorrelation[]>
  upsert(correlation: CustomCorrelation): Promise<void>
  delete(id: string): Promise<void>
}
