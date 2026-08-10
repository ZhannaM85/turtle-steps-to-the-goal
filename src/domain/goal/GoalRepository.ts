import type { Goal } from './Goal'

export interface GoalRepository {
  getActiveGoal(): Promise<Goal | undefined>
  saveGoal(goal: Goal): Promise<void>
  getAll(): Promise<Goal[]>
  /** Removes a single goal record by id — originally added for past-goal
   * history (#174, via PastTargetsList) only, since deleting the active
   * goal had no UI path at the time. #668 added that path (GoalForm's own
   * Delete goal button, via goalStore.deleteGoal), reusing this same
   * generic by-id method rather than adding a second one. */
  deleteGoal(id: string): Promise<void>
}
