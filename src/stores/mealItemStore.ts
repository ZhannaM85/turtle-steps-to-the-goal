import { create } from 'zustand'
import type { DailyEntry } from '@/domain/dailyEntry'
import type { MealItem, MealItemServing, MealItemSource } from '@/domain/mealItem'
import {
  isBackfilledMealItemSource,
  planMealLibraryBackfill,
} from '@/domain/mealItem'
import { IndexedDbMealItemRepository } from '@/infrastructure/persistence/indexeddb'
import { normalizeTextSpaces } from '@/shared/lib/normalizeTextSpaces'

const mealItemRepository = new IndexedDbMealItemRepository()

export interface MealLibraryBackfillResult {
  added: number
  totalUniqueNamed: number
  truncated: boolean
}

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
      /** Dietary fiber in grams (#341) — same optional shape as the three
       * macros above. */
      fiberG?: number
      amountG?: number
      /** #531 — electrolytes (mg). */
      sodiumMg?: number
      potassiumMg?: number
      magnesiumMg?: number
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
  /** #603 — replaces this item's named serving descriptors wholesale (the
   * editor always saves the full current list, same "whole list" shape
   * as most small-list editors in this app, e.g. `MealLabelPresetsSection`),
   * independent of `touch()`'s own nutrition bookkeeping. */
  setServings: (id: string, servings: MealItemServing[]) => Promise<void>
  /** #779 — attach or clear a barcode on an existing library row so a
   * later scan hits `findByBarcode`. Empty/whitespace clears. If another
   * row already owns that code (unique `&barcode` index, #256), returns
   * `{ takenBy }` instead of silently skipping (#784). */
  setBarcode: (
    id: string,
    barcode: string | undefined,
  ) => Promise<{ takenBy?: string; takenById?: string }>
  /** #785 — take a code off `fromId` and put it on `toId`. Does not
   * merge names, macros, or history. */
  reassignBarcode: (
    fromId: string,
    toId: string,
    barcode: string,
  ) => Promise<void>
  /** #781 — attach or clear a brand on an existing library row. */
  setBrand: (id: string, brand: string | undefined) => Promise<void>
  /**
   * #541 — add missing named dishes from day history into the library,
   * tagged for reversible undo. Does not change day meal history.
   */
  backfillFromHistory: (
    entries: readonly DailyEntry[],
    source: MealItemSource,
  ) => Promise<MealLibraryBackfillResult>
  /** #541 — delete only tagged backfill rows; day history untouched. */
  removeBackfilledItems: () => Promise<number>
  /**
   * #661 — add or update a personal library row from a shared-food import
   * review. When `existingId` is set (barcode/name match), that row is
   * updated in place; otherwise a new row is created.
   */
  applySharedFood: (input: {
    name: string
    barcode?: string
    nutrition: {
      amountKcal?: number
      proteinG?: number
      fatG?: number
      carbsG?: number
      amountG?: number
    }
    servings?: MealItemServing[]
    existingId?: string
  }) => Promise<void>
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
    const trimmed = normalizeTextSpaces(name).trim()
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
      lastFiberG: nutrition?.fiberG ?? existing?.lastFiberG,
      lastAmountG: nutrition?.amountG ?? existing?.lastAmountG,
      lastSodiumMg: nutrition?.sodiumMg ?? existing?.lastSodiumMg,
      lastPotassiumMg: nutrition?.potassiumMg ?? existing?.lastPotassiumMg,
      lastMagnesiumMg: nutrition?.magnesiumMg ?? existing?.lastMagnesiumMg,
      favorite: favorite ?? existing?.favorite,
      source: existing?.source,
    }
    // #784 — only write barcode when the caller passed a 4th arg. An
    // explicit `barcode: undefined` on the put overwrote the spread and
    // could drop a code `setBarcode` had just stored; brand is not in this
    // object at all, which is why brand stuck and barcode did not.
    if (barcode !== undefined) {
      if (barcode) item.barcode = barcode
      else delete item.barcode
    }
    await mealItemRepository.upsert(item)
    set({ items: await mealItemRepository.getAll() })
  },
  rename: async (id, name) => {
    const trimmed = normalizeTextSpaces(name).trim()
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
  setServings: async (id, servings) => {
    const current = get().items.find((item) => item.id === id)
    if (!current) return
    await mealItemRepository.upsert({
      ...current,
      servings,
      updatedAt: new Date().toISOString(),
    })
    set({ items: await mealItemRepository.getAll() })
  },
  setBarcode: async (id, barcode) => {
    let current = get().items.find((item) => item.id === id)
    if (!current) {
      current = (await mealItemRepository.getAll()).find(
        (item) => item.id === id,
      )
    }
    if (!current) return {}
    const trimmed = barcode?.replace(/\s+/g, '').trim()
    const next: MealItem = {
      ...current,
      updatedAt: new Date().toISOString(),
    }
    if (trimmed) {
      const collision = await mealItemRepository.findByBarcode(trimmed)
      if (collision && collision.id !== id) {
        return { takenBy: collision.name, takenById: collision.id }
      }
      next.barcode = trimmed
    } else {
      delete next.barcode
    }
    try {
      await mealItemRepository.upsert(next)
    } catch (err) {
      if (trimmed) {
        const collision = await mealItemRepository.findByBarcode(trimmed)
        if (collision && collision.id !== id) {
          return { takenBy: collision.name, takenById: collision.id }
        }
      }
      throw err
    }
    set({ items: await mealItemRepository.getAll() })
    return {}
  },
  reassignBarcode: async (fromId, toId, barcode) => {
    const trimmed = barcode.replace(/\s+/g, '').trim()
    if (!trimmed || fromId === toId) return
    await get().setBarcode(fromId, undefined)
    await get().setBarcode(toId, trimmed)
  },
  setBrand: async (id, brand) => {
    const current = get().items.find((item) => item.id === id)
    if (!current) return
    const trimmed = brand?.trim()
    const next: MealItem = {
      ...current,
      updatedAt: new Date().toISOString(),
    }
    if (trimmed) {
      next.brand = trimmed
    } else {
      delete next.brand
    }
    await mealItemRepository.upsert(next)
    set({ items: await mealItemRepository.getAll() })
  },
  backfillFromHistory: async (entries, source) => {
    const existing = await mealItemRepository.getAll()
    const plan = planMealLibraryBackfill(entries, existing)
    const now = new Date().toISOString()
    for (const candidate of plan.candidates) {
      const item: MealItem = {
        id: crypto.randomUUID(),
        name: candidate.name,
        createdAt: now,
        updatedAt: now,
        lastAmountKcal: candidate.amountKcal,
        lastProteinG: candidate.proteinG,
        lastFatG: candidate.fatG,
        lastCarbsG: candidate.carbsG,
        lastFiberG: candidate.fiberG,
        lastAmountG: candidate.amountG,
        lastSodiumMg: candidate.sodiumMg,
        lastPotassiumMg: candidate.potassiumMg,
        lastMagnesiumMg: candidate.magnesiumMg,
        source,
      }
      await mealItemRepository.upsert(item)
    }
    set({ items: await mealItemRepository.getAll(), status: 'ready' })
    return {
      added: plan.candidates.length,
      totalUniqueNamed: plan.totalUniqueNamed,
      truncated: plan.truncated,
    }
  },
  removeBackfilledItems: async () => {
    const existing = await mealItemRepository.getAll()
    const toRemove = existing.filter((item) =>
      isBackfilledMealItemSource(item.source),
    )
    for (const item of toRemove) {
      await mealItemRepository.delete(item.id)
    }
    set({ items: await mealItemRepository.getAll(), status: 'ready' })
    return toRemove.length
  },
  applySharedFood: async ({ name, barcode, nutrition, servings, existingId }) => {
    const trimmed = normalizeTextSpaces(name).trim()
    if (!trimmed) return
    const now = new Date().toISOString()
    const current = existingId
      ? get().items.find((item) => item.id === existingId)
      : undefined

    if (current) {
      // Rename collision: same as rename() — drop this id if another row
      // already owns the target name.
      const nameOwner = await mealItemRepository.findByName(trimmed)
      if (nameOwner && nameOwner.id !== current.id) {
        await mealItemRepository.delete(current.id)
        await mealItemRepository.upsert({
          ...nameOwner,
          updatedAt: now,
          lastAmountKcal: nutrition.amountKcal ?? nameOwner.lastAmountKcal,
          lastProteinG: nutrition.proteinG ?? nameOwner.lastProteinG,
          lastFatG: nutrition.fatG ?? nameOwner.lastFatG,
          lastCarbsG: nutrition.carbsG ?? nameOwner.lastCarbsG,
          lastAmountG: nutrition.amountG ?? nameOwner.lastAmountG,
          barcode: barcode ?? nameOwner.barcode,
          servings: servings ?? nameOwner.servings,
        })
      } else {
        await mealItemRepository.upsert({
          ...current,
          name: trimmed,
          updatedAt: now,
          lastAmountKcal: nutrition.amountKcal ?? current.lastAmountKcal,
          lastProteinG: nutrition.proteinG ?? current.lastProteinG,
          lastFatG: nutrition.fatG ?? current.lastFatG,
          lastCarbsG: nutrition.carbsG ?? current.lastCarbsG,
          lastAmountG: nutrition.amountG ?? current.lastAmountG,
          barcode: barcode ?? current.barcode,
          servings: servings ?? current.servings,
        })
      }
    } else {
      const existingByName = await mealItemRepository.findByName(trimmed)
      const item: MealItem = {
        ...(existingByName ?? {
          id: crypto.randomUUID(),
          name: trimmed,
          createdAt: now,
        }),
        name: trimmed,
        updatedAt: now,
        lastAmountKcal: nutrition.amountKcal ?? existingByName?.lastAmountKcal,
        lastProteinG: nutrition.proteinG ?? existingByName?.lastProteinG,
        lastFatG: nutrition.fatG ?? existingByName?.lastFatG,
        lastCarbsG: nutrition.carbsG ?? existingByName?.lastCarbsG,
        lastAmountG: nutrition.amountG ?? existingByName?.lastAmountG,
        favorite: existingByName?.favorite,
        barcode: barcode ?? existingByName?.barcode,
        source: existingByName?.source,
        servings: servings ?? existingByName?.servings,
      }
      await mealItemRepository.upsert(item)
    }
    set({ items: await mealItemRepository.getAll(), status: 'ready' })
  },
}))
