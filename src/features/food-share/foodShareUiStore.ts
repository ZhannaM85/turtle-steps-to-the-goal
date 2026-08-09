import { create } from 'zustand'
import type { SharedFoodPayload } from './sharedFoodPayload'

interface FoodShareUiState {
  entryOpen: boolean
  setEntryOpen: (open: boolean) => void
  importOpen: boolean
  payload: SharedFoodPayload | null
  openImport: (payload: SharedFoodPayload) => void
  setImportOpen: (open: boolean) => void
}

/** #661 — bridges Settings' "Import shared food" button with the AppShell
 * host that also watches `?shareFood=` deep links. */
export const useFoodShareUiStore = create<FoodShareUiState>((set) => ({
  entryOpen: false,
  setEntryOpen: (entryOpen) => set({ entryOpen }),
  importOpen: false,
  payload: null,
  openImport: (payload) =>
    set({ payload, importOpen: true, entryOpen: false }),
  setImportOpen: (importOpen) =>
    set(importOpen ? { importOpen } : { importOpen, payload: null }),
}))
