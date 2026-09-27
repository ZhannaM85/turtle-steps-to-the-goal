import { create } from 'zustand'
import { foods, type FoodItem } from '@/data/foods'
import {
  catalogLdlChanged,
  type CholesterolImpact,
  type DiaryLdlStamp,
} from '@/domain/cholesterol'
import {
  canonicalCatalogName,
  collapseCatalogName,
  mergeCatalogFoodImports,
  mealItemUpdatedByCatalogBarcode,
  normalizeCatalogBarcode,
  planCatalogFoodUpserts,
  type CatalogFoodDraft,
  type CatalogFoodImport,
} from '@/domain/catalogFoodImport'
import {
  IndexedDbCatalogFoodImportRepository,
  IndexedDbMealItemRepository,
} from '@/infrastructure/persistence/indexeddb'
import { persistDiaryLdlStamps } from './persistDiaryLdlStamps'
import { useMealItemStore } from './mealItemStore'

const repository = new IndexedDbCatalogFoodImportRepository()
const mealItemRepository = new IndexedDbMealItemRepository()

interface CatalogFoodImportStoreState {
  imports: CatalogFoodImport[]
  status: 'idle' | 'loading' | 'ready' | 'error'
  error: string | null
  load: () => Promise<void>
  /** Upsert by barcode, then Russian name. LDL on matching diary rows is restamped. */
  importFoods: (
    drafts: readonly CatalogFoodDraft[],
  ) => Promise<{ added: number; updated: number }>
  /**
   * #1027 — a manual save whose barcode is already on a catalog row updates
   * that row. A new barcode does not create a catalog row.
   */
  rememberSavedFood: (input: {
    name: string
    barcode?: string
    brand?: string
    per100g?: {
      kcal100: number
      protein100: number
      fat100: number
      carbs100: number
      cholesterolImpact?: CholesterolImpact
      cholesterolReason?: string
    }
  }) => Promise<void>
}

function sameName(left: string, right: string | undefined): boolean {
  if (!right) return false
  return collapseCatalogName(left).toLowerCase() === collapseCatalogName(right).toLowerCase()
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
      const updatedAt = new Date().toISOString()
      const plan = planCatalogFoodUpserts(existing, drafts, foods, updatedAt)
      const stamps: DiaryLdlStamp[] = []
      for (const draft of drafts) {
        const nameRu = canonicalCatalogName(draft.nameRu, foods)
        const code = normalizeCatalogBarcode(draft.barcode)
        const named = { ...draft, nameRu, barcode: code }
        const previous = code
          ? (before.find(
              (food) => normalizeCatalogBarcode(food.barcode) === code,
            ) ?? before.find((food) => food.ru === nameRu))
          : before.find((food) => food.ru === nameRu)
        if (
          catalogLdlChanged(previous, {
            cholesterolImpact: draft.cholesterolImpact,
            cholesterolReason: draft.cholesterolReason,
          })
        ) {
          stamps.push({
            names: matchNames(named, previous),
            cholesterolImpact: draft.cholesterolImpact,
            cholesterolReason: draft.cholesterolReason,
          })
        }
      }
      for (const name of plan.deleteNames) await repository.delete(name)
      for (const row of plan.upserts) await repository.upsert(row)
      let library = await mealItemRepository.getAll()
      let libraryChanged = false
      for (const row of plan.upserts) {
        const next = mealItemUpdatedByCatalogBarcode(library, row, updatedAt)
        if (!next) continue
        await mealItemRepository.upsert(next)
        library = library.map((item) => (item.id === next.id ? next : item))
        libraryChanged = true
      }
      if (libraryChanged) {
        useMealItemStore.setState({
          items: await mealItemRepository.getAll(),
        })
      }
      const imports = await repository.getAll()
      set({ imports, status: 'ready', error: null })
      await persistDiaryLdlStamps(stamps)
      return { added: plan.added, updated: plan.updated }
    },
    rememberSavedFood: async (input) => {
      const code = normalizeCatalogBarcode(input.barcode)
      const name = collapseCatalogName(input.name)
      if (!code || !name) return
      const existing = await repository.getAll()
      const hit = existing.find(
        (row) => normalizeCatalogBarcode(row.barcode) === code,
      )
      if (!hit) return
      const keepName = sameName(name, hit.nameRu) || sameName(name, hit.nameEn)
      const draft: CatalogFoodDraft = {
        nameRu: keepName ? hit.nameRu : name,
        kcal100: input.per100g?.kcal100 ?? hit.kcal100,
        protein100: input.per100g?.protein100 ?? hit.protein100,
        fat100: input.per100g?.fat100 ?? hit.fat100,
        carbs100: input.per100g?.carbs100 ?? hit.carbs100,
        cholesterolImpact:
          input.per100g?.cholesterolImpact ?? hit.cholesterolImpact,
        barcode: code,
      }
      if (hit.nameEn) draft.nameEn = hit.nameEn
      const reason = input.per100g?.cholesterolReason ?? hit.cholesterolReason
      if (reason) draft.cholesterolReason = reason
      if (hit.cholesterolReasonEn) draft.cholesterolReasonEn = hit.cholesterolReasonEn
      const brand = collapseCatalogName(input.brand ?? '') || hit.brand
      if (brand) draft.brand = brand
      const updatedAt = new Date().toISOString()
      const before = mergeCatalogFoodImports(foods, existing)
      const plan = planCatalogFoodUpserts(existing, [draft], foods, updatedAt)
      for (const rowName of plan.deleteNames) await repository.delete(rowName)
      for (const row of plan.upserts) await repository.upsert(row)
      const imports = await repository.getAll()
      set({ imports, status: 'ready', error: null })
      const previous = before.find(
        (food) => normalizeCatalogBarcode(food.barcode) === code,
      )
      if (
        catalogLdlChanged(previous, {
          cholesterolImpact: draft.cholesterolImpact,
          cholesterolReason: draft.cholesterolReason,
        })
      ) {
        await persistDiaryLdlStamps([
          {
            names: matchNames(draft, previous),
            cholesterolImpact: draft.cholesterolImpact,
            cholesterolReason: draft.cholesterolReason,
          },
        ])
      }
    },
  }),
)

/** Meal search and barcode scan share one merged catalog. */
export async function loadMergedCatalogFoods(): Promise<FoodItem[]> {
  const state = useCatalogFoodImportStore.getState()
  if (state.status !== 'ready') await state.load()
  return mergeCatalogFoodImports(
    foods,
    useCatalogFoodImportStore.getState().imports,
  )
}
