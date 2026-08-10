import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Goal } from '@/domain/goal'
import { IndexedDbGoalRepository } from '@/infrastructure/persistence/indexeddb'

const goalRepository = new IndexedDbGoalRepository()

interface GoalStoreState {
  goal: Goal | null
  status: 'idle' | 'loading' | 'ready' | 'error'
  error: string | null
  /**
   * #677 — after the user intentionally deletes the active goal, skip
   * promoting the next-newest history record via `loadActiveGoal`.
   * Persisted to localStorage so a full page refresh doesn't resurrect
   * an older goal as "active" until the user saves a new one.
   */
  skipPromotingNextActive: boolean
  loadActiveGoal: () => Promise<void>
  saveGoal: (goal: Goal) => Promise<void>
  /** #668 — deletes the active goal record entirely (GoalRepository's
   * deleteGoal is a plain by-id removal; no-op if there's nothing active). */
  deleteGoal: () => Promise<void>
}

export const useGoalStore = create<GoalStoreState>()(
  persist(
    (set, get) => ({
      goal: null,
      status: 'idle',
      error: null,
      skipPromotingNextActive: false,
      loadActiveGoal: async () => {
        // #677 — avoid flipping `status` back through `loading` when we
        // already have a ready tree mounted (GoalScreen gates the whole form
        // on `status === 'loading' | 'idle'`). A mid-session reload that
        // unmounted `GoalForm` wiped #674's `justDeletedGoal` snapshot.
        const alreadyReady = get().status === 'ready'
        if (!alreadyReady) {
          set({ status: 'loading', error: null })
        } else {
          set({ error: null })
        }
        try {
          if (get().skipPromotingNextActive) {
            set({ goal: null, status: 'ready' })
            return
          }
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
        set({ goal, status: 'ready', skipPromotingNextActive: false })
      },
      deleteGoal: async () => {
        const { goal } = get()
        if (!goal) return
        await goalRepository.deleteGoal(goal.id)
        set({ goal: null, status: 'ready', skipPromotingNextActive: true })
      },
    }),
    {
      name: 'turtle-steps-goal',
      storage: createJSONStorage(() => localStorage),
      // Goal data lives in IndexedDB; only the "don't auto-promote after
      // delete" preference needs to survive a refresh (#677).
      partialize: (state) => ({
        skipPromotingNextActive: state.skipPromotingNextActive,
      }),
    },
  ),
)
