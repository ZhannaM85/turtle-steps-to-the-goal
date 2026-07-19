import type { Goal } from './Goal'

export interface GoalRepository {
  getActiveGoal(): Promise<Goal | undefined>
  saveGoal(goal: Goal): Promise<void>
  getAll(): Promise<Goal[]>
  /** Removes a single past-goal history record (#174) — deleting the
   * currently active goal is not a supported use case (there's no UI path
   * to it; PastTargetsList only ever passes ids from the non-active
   * history list). */
  deleteGoal(id: string): Promise<void>
}
