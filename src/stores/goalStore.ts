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
}

export const useGoalStore = create<GoalStoreState>((set) => ({
  goal: null,
  status: 'idle',
  error: null,
  loadActiveGoal: async () => {
    set({ status: 'loading', error: null })
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
}))
