import type { FoodOverride, FoodOverrideRepository } from '@/domain/foodOverride'
import { db } from './db'

export class IndexedDbFoodOverrideRepository implements FoodOverrideRepository {
  async getAll(): Promise<FoodOverride[]> {
    return db.foodOverrides.toArray()
  }

  async upsert(override: FoodOverride): Promise<void> {
    await db.foodOverrides.put(override)
  }

  async delete(foodId: string): Promise<void> {
    await db.foodOverrides.delete(foodId)
  }
}
