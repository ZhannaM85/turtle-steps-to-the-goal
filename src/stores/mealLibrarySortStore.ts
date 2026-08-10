import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { MealLibrarySort } from '@/shared/lib/sortMealLibraryItems'

export type { MealLibrarySort }
export {
  isMealLibrarySort,
  MEAL_LIBRARY_SORT_OPTIONS,
} from '@/shared/lib/sortMealLibraryItems'

/**
 * Settings → Dishes (#684) list order — local UI preference, same category
 * as week-start / entry-comparison (not part of the export bundle).
 */
interface MealLibrarySortStoreState {
  sort: MealLibrarySort
  setSort: (sort: MealLibrarySort) => void
}

export const useMealLibrarySortStore = create<MealLibrarySortStoreState>()(
  persist(
    (set) => ({
      sort: 'title-asc',
      setSort: (sort) => set({ sort }),
    }),
    {
      name: 'turtle-steps-meal-library-sort',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
