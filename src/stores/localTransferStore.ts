import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/**
 * #738 — opt-in “send this day’s log to another copy” (#717). Off by default:
 * most people run one PWA or one native app, not both. Device-only chrome
 * (not in the JSON backup / `settingsPreferences`) — it does not change
 * what Day shows. #720–#724 send/receive/QR UI and snippet deep links
 * must read this before showing UI or applying a payload.
 */
interface LocalTransferStoreState {
  enabled: boolean
  setEnabled: (enabled: boolean) => void
}

export const useLocalTransferStore = create<LocalTransferStoreState>()(
  persist(
    (set) => ({
      enabled: false,
      setEnabled: (enabled) => set({ enabled }),
    }),
    {
      name: 'turtle-steps-local-transfer',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)

export function isLocalTransferEnabled(): boolean {
  return useLocalTransferStore.getState().enabled
}
