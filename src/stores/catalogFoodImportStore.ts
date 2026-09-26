import { create } from 'zustand'
import { foods } from '@/data/foods'
import {
  canonicalCatalogName,
  type CatalogFoodDraft,
  type CatalogFoodImport,
} from '@/domain/catalogFoodImport'
import { IndexedDbCatalogFoodImportRepository } from '@/infrastructure/persistence/indexeddb'

const repository = new IndexedDbCatalogFoodImportRepository()

interface CatalogFoodImportStoreState {
  imports: CatalogFoodImport[]
  status: 'idle' | 'loading' | 'ready' | 'error'
  error: string | null
  load: () => Promise<void>
  /** Upsert by Russian name. Does not rewrite diary history. */
  importFoods: (
    drafts: readonly CatalogFoodDraft[],
  ) => Promise<{ added: number; updated: number }>
}

function toRow(draft: CatalogFoodDraft, updatedAt: string): CatalogFoodImport {
  const row: CatalogFoodImport = {
    nameRu: draft.nameRu,
    kcal100: draft.kcal100,
    protein100: draft.protein100,
    fat100: draft.fat100,
    carbs100: draft.carbs100,
    cholesterolImpact: draft.cholesterolImpact,
    updatedAt,
  }
  if (draft.nameEn) row.nameEn = draft.nameEn
  if (draft.cholesterolReason) row.cholesterolReason = draft.cholesterolReason
  if (draft.cholesterolReasonEn) row.cholesterolReasonEn = draft.cholesterolReasonEn
  return row
}

export const useCatalogFoodImportStore = create<CatalogFoodImportStoreState>(
  (set) => ({
    imports: [],
    status: 'idle',
    error: null,
    load: async () => {
      set({ status: 'loading', error: null })
      try {
        const imports = await repository.getAll()
        set({ imports, status: 'ready' })
      } catch (err) {
        set({
          status: 'error',
          error:
            err instanceof Error
              ? err.message
              : 'Failed to load catalog food imports',
        })
      }
    },
    importFoods: async (drafts) => {
      const existing = await repository.getAll()
      const known = new Set(existing.map((row) => row.nameRu))
      const planned = new Map<string, CatalogFoodDraft>()
      for (const draft of drafts) {
        const nameRu = canonicalCatalogName(draft.nameRu, foods)
        planned.set(nameRu, { ...draft, nameRu })
      }
      let added = 0
      let updated = 0
      const updatedAt = new Date().toISOString()
      for (const draft of planned.values()) {
        if (known.has(draft.nameRu)) updated += 1
        else {
          added += 1
          known.add(draft.nameRu)
        }
        await repository.upsert(toRow(draft, updatedAt))
      }
      const imports = await repository.getAll()
      set({ imports, status: 'ready', error: null })
      return { added, updated }
    },
  }),
)
