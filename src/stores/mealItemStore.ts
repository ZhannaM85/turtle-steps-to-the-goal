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
   * Bumps updatedAt on an existing item rather than duplicating it. */
  touch: (name: string) => Promise<void>
  /** Renames a library item. If another item already has the target name,
   * merges into it (deletes this one) instead of violating the unique
   * name index. */
  rename: (id: string, name: string) => Promise<void>
  deleteItem: (id: string) => Promise<void>
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
  touch: async (name) => {
    const trimmed = name.trim()
    if (!trimmed) return
    const existing = await mealItemRepository.findByName(trimmed)
    const now = new Date().toISOString()
    const item: MealItem = existing
      ? { ...existing, updatedAt: now }
      : { id: crypto.randomUUID(), name: trimmed, createdAt: now, updatedAt: now }
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
}))
