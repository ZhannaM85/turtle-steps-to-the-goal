import { create } from 'zustand'
import { foods, type FoodItem } from '@/data/foods'
import { catalogLdlChanged, type DiaryLdlStamp } from '@/domain/cholesterol'
import {
  canonicalCatalogName,
  mergeCatalogFoodImports,
  type CatalogFoodDraft,
  type CatalogFoodImport,
} from '@/domain/catalogFoodImport'
import { IndexedDbCatalogFoodImportRepository } from '@/infrastructure/persistence/indexeddb'
import { persistDiaryLdlStamps } from './persistDiaryLdlStamps'

const repository = new IndexedDbCatalogFoodImportRepository()

interface CatalogFoodImportStoreState {
  imports: CatalogFoodImport[]
  status: 'idle' | 'loading' | 'ready' | 'error'
  error: string | null
  load: () => Promise<void>
  /** Upsert by Russian name. LDL on matching diary rows is restamped. */
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

/** Russian name, English name, and paste aliases — whole names only. */
function matchNames(
  draft: CatalogFoodDraft,
  previous: FoodItem | undefined,
): string[] {
  const names = [draft.nameRu]
  if (draft.nameEn) names.push(draft.nameEn)
  if (previous?.en) names.push(previous.en)
  if (previous?.ru) names.push(previous.ru)
  if (draft.aliases) names.push(...draft.aliases)
  return names
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
      const before = mergeCatalogFoodImports(foods, existing)
      const known = new Set(existing.map((row) => row.nameRu))
      const planned = new Map<string, CatalogFoodDraft>()
      for (const draft of drafts) {
        const nameRu = canonicalCatalogName(draft.nameRu, foods)
        planned.set(nameRu, { ...draft, nameRu })
      }
      let added = 0
      let updated = 0
      const updatedAt = new Date().toISOString()
      const stamps: DiaryLdlStamp[] = []
      for (const draft of planned.values()) {
        const previous = before.find((food) => food.ru === draft.nameRu)
        if (
          catalogLdlChanged(previous, {
            cholesterolImpact: draft.cholesterolImpact,
            cholesterolReason: draft.cholesterolReason,
          })
        ) {
          stamps.push({
            names: matchNames(draft, previous),
            cholesterolImpact: draft.cholesterolImpact,
            cholesterolReason: draft.cholesterolReason,
          })
        }
        if (known.has(draft.nameRu)) updated += 1
        else {
          added += 1
          known.add(draft.nameRu)
        }
        await repository.upsert(toRow(draft, updatedAt))
      }
      const imports = await repository.getAll()
      set({ imports, status: 'ready', error: null })
      await persistDiaryLdlStamps(stamps)
      return { added, updated }
    },
  }),
)
