import type { PlannedMeal, PlannedMealRepository } from '@/domain/plannedMeal'
import { db } from './db'

export class IndexedDbPlannedMealRepository implements PlannedMealRepository {
  async getAll(): Promise<PlannedMeal[]> {
    return db.plannedMeals.toArray()
  }

  async getByDate(date: string): Promise<PlannedMeal[]> {
    return db.plannedMeals.where('date').equals(date).toArray()
  }

  async upsert(plannedMeal: PlannedMeal): Promise<void> {
    await db.plannedMeals.put(plannedMeal)
  }

  async delete(id: string): Promise<void> {
    await db.plannedMeals.delete(id)
  }
}
