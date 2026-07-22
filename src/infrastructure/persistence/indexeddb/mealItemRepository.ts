import type { MealItem, MealItemRepository } from '@/domain/mealItem'
import { db } from './db'

export class IndexedDbMealItemRepository implements MealItemRepository {
  async getAll(): Promise<MealItem[]> {
    return db.mealItems.orderBy('name').toArray()
  }

  async findByName(name: string): Promise<MealItem | undefined> {
    return db.mealItems.where('name').equals(name).first()
  }

  async findByBarcode(barcode: string): Promise<MealItem | undefined> {
    return db.mealItems.where('barcode').equals(barcode).first()
  }

  async upsert(item: MealItem): Promise<void> {
    await db.mealItems.put(item)
  }

  async delete(id: string): Promise<void> {
    await db.mealItems.delete(id)
  }
}
