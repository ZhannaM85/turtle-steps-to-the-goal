import type { Goal } from './Goal'

export interface GoalRepository {
  getActiveGoal(): Promise<Goal | undefined>
  saveGoal(goal: Goal): Promise<void>
  getAll(): Promise<Goal[]>
}
