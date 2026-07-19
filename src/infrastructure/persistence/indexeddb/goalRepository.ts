import type { Goal, GoalRepository } from '@/domain/goal'
import { db } from './db'

export class IndexedDbGoalRepository implements GoalRepository {
  async getActiveGoal(): Promise<Goal | undefined> {
    return db.goals.orderBy('createdAt').last()
  }

  async saveGoal(goal: Goal): Promise<void> {
    await db.goals.put(goal)
  }

  async getAll(): Promise<Goal[]> {
    return db.goals.orderBy('createdAt').toArray()
  }

  async deleteGoal(id: string): Promise<void> {
    await db.goals.delete(id)
  }
}
