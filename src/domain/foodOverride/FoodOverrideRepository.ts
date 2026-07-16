import type { FoodOverride } from './FoodOverride'

export interface FoodOverrideRepository {
  getAll(): Promise<FoodOverride[]>
  upsert(override: FoodOverride): Promise<void>
  delete(foodId: string): Promise<void>
}
