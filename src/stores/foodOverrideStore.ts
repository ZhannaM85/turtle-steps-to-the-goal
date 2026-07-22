import { create } from 'zustand'
import type { FoodOverride } from '@/domain/foodOverride'
import { IndexedDbFoodOverrideRepository } from '@/infrastructure/persistence/indexeddb'

const foodOverrideRepository = new IndexedDbFoodOverrideRepository()

interface FoodOverrideStoreState {
  overrides: FoodOverride[]
  status: 'idle' | 'loading' | 'ready' | 'error'
  error: string | null
  loadOverrides: () => Promise<void>
  setHidden: (foodId: string, hidden: boolean) => Promise<void>
  setFavorite: (foodId: string, favorite: boolean) => Promise<void>
  setNutrition: (
    foodId: string,
    nutrition: {
      kcal100: number
      protein100: number
      fat100: number
      carbs100: number
    },
  ) => Promise<void>
  /** Clears an override entirely, reverting the food to its shipped
   * foods.ts values (both visibility and any corrected numbers). */
  restoreDefault: (foodId: string) => Promise<void>
}

function existingOrBlank(
  overrides: FoodOverride[],
  foodId: string,
): FoodOverride {
  return (
    overrides.find((o) => o.foodId === foodId) ?? {
      foodId,
      updatedAt: new Date().toISOString(),
    }
  )
}

export const useFoodOverrideStore = create<FoodOverrideStoreState>(
  (set, get) => ({
    overrides: [],
    status: 'idle',
    error: null,
    loadOverrides: async () => {
      set({ status: 'loading', error: null })
      try {
        const overrides = await foodOverrideRepository.getAll()
        set({ overrides, status: 'ready' })
      } catch (err) {
        set({
          status: 'error',
          error:
            err instanceof Error ? err.message : 'Failed to load food overrides',
        })
      }
    },
    setHidden: async (foodId, hidden) => {
      const current = existingOrBlank(get().overrides, foodId)
      const next: FoodOverride = {
        ...current,
        hidden,
        updatedAt: new Date().toISOString(),
      }
      await foodOverrideRepository.upsert(next)
      set({ overrides: await foodOverrideRepository.getAll() })
    },
    setFavorite: async (foodId, favorite) => {
      const current = existingOrBlank(get().overrides, foodId)
      const next: FoodOverride = {
        ...current,
        favorite,
        updatedAt: new Date().toISOString(),
      }
      await foodOverrideRepository.upsert(next)
      set({ overrides: await foodOverrideRepository.getAll() })
    },
    setNutrition: async (foodId, nutrition) => {
      const current = existingOrBlank(get().overrides, foodId)
      const next: FoodOverride = {
        ...current,
        ...nutrition,
        updatedAt: new Date().toISOString(),
      }
      await foodOverrideRepository.upsert(next)
      set({ overrides: await foodOverrideRepository.getAll() })
    },
    restoreDefault: async (foodId) => {
      await foodOverrideRepository.delete(foodId)
      set({ overrides: await foodOverrideRepository.getAll() })
    },
  }),
)
