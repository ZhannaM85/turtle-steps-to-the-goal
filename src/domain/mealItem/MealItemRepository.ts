import type { MealItem } from './MealItem'

export interface MealItemRepository {
  getAll(): Promise<MealItem[]>
  findByName(name: string): Promise<MealItem | undefined>
  upsert(item: MealItem): Promise<void>
  delete(id: string): Promise<void>
}
