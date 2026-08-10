import { create } from 'zustand'
import type { Goal } from '@/domain/goal'
import { IndexedDbGoalRepository } from '@/infrastructure/persistence/indexeddb'

const goalRepository = new IndexedDbGoalRepository()

interface GoalStoreState {
  goal: Goal | null
  status: 'idle' | 'loading' | 'ready' | 'error'
  error: string | null
  loadActiveGoal: () => Promise<void>
  saveGoal: (goal: Goal) => Promise<void>
  /**
   * #668 / #677 — pops the active goal (stack top). The next-newest
   * remaining record becomes active (`getActiveGoal`); if none remain,
   * `goal` is null. Refresh then shows that same previous goal.
   */
  deleteGoal: () => Promise<void>
}

export const useGoalStore = create<GoalStoreState>((set, get) => ({
  goal: null,
  status: 'idle',
  error: null,
  loadActiveGoal: async () => {
    // Avoid flipping `status` through `loading` when a ready tree is already
    // mounted (GoalScreen gates the form on loading/idle) — soft reloads
    // must not unmount GoalForm mid-session (#677).
    const alreadyReady = get().status === 'ready'
    if (!alreadyReady) {
      set({ status: 'loading', error: null })
    } else {
      set({ error: null })
    }
    try {
      const goal = await goalRepository.getActiveGoal()
      set({ goal: goal ?? null, status: 'ready' })
    } catch (err) {
      set({
        status: 'error',
        error: err instanceof Error ? err.message : 'Failed to load the goal',
      })
    }
  },
  saveGoal: async (goal) => {
    await goalRepository.saveGoal(goal)
    set({ goal, status: 'ready' })
  },
  deleteGoal: async () => {
    const { goal } = get()
    if (!goal) return
    await goalRepository.deleteGoal(goal.id)
    // Stack pop (#677): promote the previous goal (newest remaining).
    const previous = await goalRepository.getActiveGoal()
    set({ goal: previous ?? null, status: 'ready' })
  },
}))
