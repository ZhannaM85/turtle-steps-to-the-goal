import type { PlannedMeal } from './PlannedMeal'

export interface PlannedMealRepository {
  getAll(): Promise<PlannedMeal[]>
  getByDate(date: string): Promise<PlannedMeal[]>
  upsert(plannedMeal: PlannedMeal): Promise<void>
  delete(id: string): Promise<void>
}
