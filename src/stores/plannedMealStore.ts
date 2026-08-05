import { create } from 'zustand'
import type { PlannedMeal } from '@/domain/plannedMeal'
import { IndexedDbPlannedMealRepository } from '@/infrastructure/persistence/indexeddb'

const plannedMealRepository = new IndexedDbPlannedMealRepository()

interface PlannedMealStoreState {
  plannedMeals: PlannedMeal[]
  status: 'idle' | 'loading' | 'ready' | 'error'
  error: string | null
  loadAll: () => Promise<void>
  addPlannedMeal: (
    date: string,
    name: string,
    amountKcal?: number,
  ) => Promise<void>
  /** #614 — removing a draft without promoting it (either an explicit
   * discard, or after `PlannedMealsSection.tsx` has already copied it into
   * a real `CalorieEntry`). */
  deletePlannedMeal: (id: string) => Promise<void>
}

export const usePlannedMealStore = create<PlannedMealStoreState>(
  (set, get) => ({
    plannedMeals: [],
    status: 'idle',
    error: null,
    loadAll: async () => {
      // `PlannedMealsSection` fires this on every mount (remounted often —
      // date navigation, the section's own accordion collapsing/reopening,
      // tab switches) — unlike other loadAll-on-mount stores in this app,
      // this section mounts unconditionally on the Day screen's
      // most-frequently-rendered path. Skipping a redundant re-fetch once
      // already loading/loaded avoids piling up concurrent Dexie reads for
      // no reason beyond the first.
      if (get().status === 'loading' || get().status === 'ready') return
      set({ status: 'loading', error: null })
      try {
        const plannedMeals = await plannedMealRepository.getAll()
        set({ plannedMeals, status: 'ready' })
      } catch (err) {
        set({
          status: 'error',
          error:
            err instanceof Error
              ? err.message
              : 'Failed to load planned meals',
        })
      }
    },
    addPlannedMeal: async (date, name, amountKcal) => {
      const trimmed = name.trim()
      if (!trimmed) return
      await plannedMealRepository.upsert({
        id: crypto.randomUUID(),
        date,
        name: trimmed,
        amountKcal,
        createdAt: new Date().toISOString(),
      })
      set({ plannedMeals: await plannedMealRepository.getAll() })
    },
    deletePlannedMeal: async (id) => {
      await plannedMealRepository.delete(id)
      set({ plannedMeals: await plannedMealRepository.getAll() })
    },
  }),
)
