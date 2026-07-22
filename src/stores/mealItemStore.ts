import { create } from 'zustand'
import type { MealItem } from '@/domain/mealItem'
import { IndexedDbMealItemRepository } from '@/infrastructure/persistence/indexeddb'

const mealItemRepository = new IndexedDbMealItemRepository()

interface MealItemStoreState {
  items: MealItem[]
  status: 'idle' | 'loading' | 'ready' | 'error'
  error: string | null
  loadItems: () => Promise<void>
  /** Upsert-by-name (#50): called whenever a meal is saved with a note.
   * Bumps updatedAt on an existing item rather than duplicating it.
   * `nutrition` (#86) records the last-used kcal/macros for this name, so
   * the food picker can offer it as something reusable later. */
  touch: (
    name: string,
    nutrition?: {
      amountKcal?: number
      proteinG?: number
      fatG?: number
      carbsG?: number
      amountG?: number
    },
    /** #279 — set when a caller (the manual "Add dish" sheet, Settings'
     * own add-dish form) offers a favorite toggle right at creation time.
     * Omitted entirely preserves whatever the item already had, so every
     * pre-#279 call site is unaffected. */
    favorite?: boolean,
    /** #256 — set once, the first time a barcode scan creates this item
     * (either a local match already had one, or an Open Food Facts
     * fallback filled in the form before saving). Omitted preserves
     * whatever the item already had, same reasoning as favorite above. */
    barcode?: string,
  ) => Promise<void>
  /** Renames a library item. If another item already has the target name,
   * merges into it (deletes this one) instead of violating the unique
   * name index. */
  rename: (id: string, name: string) => Promise<void>
  deleteItem: (id: string) => Promise<void>
  /** #276 — toggles a "go-to" food, independent of `touch()`'s own
   * recency bookkeeping. */
  toggleFavorite: (id: string) => Promise<void>
}

export const useMealItemStore = create<MealItemStoreState>((set, get) => ({
  items: [],
  status: 'idle',
  error: null,
  loadItems: async () => {
    set({ status: 'loading', error: null })
    try {
      const items = await mealItemRepository.getAll()
      set({ items, status: 'ready' })
    } catch (err) {
      set({
        status: 'error',
        error: err instanceof Error ? err.message : 'Failed to load meal items',
      })
    }
  },
  touch: async (name, nutrition, favorite, barcode) => {
    const trimmed = name.trim()
    if (!trimmed) return
    const existing = await mealItemRepository.findByName(trimmed)
    const now = new Date().toISOString()
    const item: MealItem = {
      ...(existing ?? {
        id: crypto.randomUUID(),
        name: trimmed,
        createdAt: now,
      }),
      updatedAt: now,
      lastAmountKcal: nutrition?.amountKcal ?? existing?.lastAmountKcal,
      lastProteinG: nutrition?.proteinG ?? existing?.lastProteinG,
      lastFatG: nutrition?.fatG ?? existing?.lastFatG,
      lastCarbsG: nutrition?.carbsG ?? existing?.lastCarbsG,
      lastAmountG: nutrition?.amountG ?? existing?.lastAmountG,
      favorite: favorite ?? existing?.favorite,
      barcode: barcode ?? existing?.barcode,
    }
    await mealItemRepository.upsert(item)
    set({ items: await mealItemRepository.getAll() })
  },
  rename: async (id, name) => {
    const trimmed = name.trim()
    if (!trimmed) return
    const current = get().items.find((item) => item.id === id)
    if (!current) return
    const collision = await mealItemRepository.findByName(trimmed)
    if (collision && collision.id !== id) {
      await mealItemRepository.delete(id)
    } else {
      await mealItemRepository.upsert({
        ...current,
        name: trimmed,
        updatedAt: new Date().toISOString(),
      })
    }
    set({ items: await mealItemRepository.getAll() })
  },
  deleteItem: async (id) => {
    await mealItemRepository.delete(id)
    set({ items: await mealItemRepository.getAll() })
  },
  toggleFavorite: async (id) => {
    const current = get().items.find((item) => item.id === id)
    if (!current) return
    await mealItemRepository.upsert({
      ...current,
      favorite: !current.favorite,
      updatedAt: new Date().toISOString(),
    })
    set({ items: await mealItemRepository.getAll() })
  },
}))
