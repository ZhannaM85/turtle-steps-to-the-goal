import { create } from 'zustand'
import type { DaySnippetPayload } from './daySnippetPayload'

interface DayTransferUiState {
  confirmOpen: boolean
  payload: DaySnippetPayload | null
  openConfirm: (payload: DaySnippetPayload) => void
  setConfirmOpen: (open: boolean) => void
}

/** #721 — receive-side confirm, shared by deep link and paste. */
export const useDayTransferUiStore = create<DayTransferUiState>((set) => ({
  confirmOpen: false,
  payload: null,
  openConfirm: (payload) => set({ confirmOpen: true, payload }),
  setConfirmOpen: (open) =>
    set((state) => ({ confirmOpen: open, payload: open ? state.payload : null })),
}))
