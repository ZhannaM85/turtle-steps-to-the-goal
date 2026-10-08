import { closeSupersededReachedGoals, type Goal, type GoalRepository } from '@/domain/goal'
import { db } from './db'

export class IndexedDbGoalRepository implements GoalRepository {
  async getActiveGoal(): Promise<Goal | undefined> {
    return db.goals.orderBy('createdAt').last()
  }

  async saveGoal(goal: Goal): Promise<void> {
    // Enforce the early-success handoff even if GoalForm's progress prop
    // has not loaded yet. The new record and the correction commit together.
    await db.transaction('rw', db.goals, db.dailyEntries, async () => {
      await db.goals.put(goal)
      await this.repairEarlyClosures()
    })
  }

  async getAll(): Promise<Goal[]> {
    // Older backups omitted weekEnd on import. Persist narrow repairs so
    // Goal, Day, history, subsequent reloads and exports share the same range.
    return db.transaction('rw', db.goals, db.dailyEntries, () => this.repairEarlyClosures())
  }

  private async repairEarlyClosures(): Promise<Goal[]> {
    const goals = await db.goals.orderBy('createdAt').toArray()
    if (goals.length < 2) return goals
    const entries = await db.dailyEntries.toArray()
    const closed = closeSupersededReachedGoals(goals, entries)
    if (closed.length === 0) return goals
    await db.goals.bulkPut(closed)
    const byId = new Map(closed.map((goal) => [goal.id, goal]))
    return goals.map((goal) => byId.get(goal.id) ?? goal)
  }

  async deleteGoal(id: string): Promise<void> {
    await db.goals.delete(id)
  }
}
