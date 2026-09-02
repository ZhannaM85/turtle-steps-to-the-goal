import { create } from 'zustand'
import type { SharedFoodPayload } from './sharedFoodPayload'

/** Result after the receiver confirms Import shared food. */
export type SharedFoodImportResult = {
  name: string
  brand?: string
  barcode?: string
  nutrition: {
    amountKcal?: number
    proteinG?: number
    fatG?: number
    carbsG?: number
    amountG?: number
  }
}

interface FoodShareUiState {
  entryOpen: boolean
  setEntryOpen: (open: boolean) => void
  importOpen: boolean
  payload: SharedFoodPayload | null
  openImport: (payload: SharedFoodPayload) => void
  setImportOpen: (open: boolean) => void
  /** #802 — Add meal registers this so a confirmed import also lands in
   * the open meal, not only the food library. */
  onImported: ((result: SharedFoodImportResult) => void) | null
  setOnImported: (
    onImported: ((result: SharedFoodImportResult) => void) | null,
  ) => void
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
  onImported: null,
  setOnImported: (onImported) => set({ onImported }),
}))
