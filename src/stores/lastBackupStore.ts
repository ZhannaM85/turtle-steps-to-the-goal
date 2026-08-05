import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/**
 * Tracks JSON backup export recency (#599) — a local UI preference, same
 * category as unit/theme, not part of the export bundle itself (a backup
 * of "when you last made a backup" would be circular). `firstSeenAt`
 * defaults to "now" the very first time this store is ever created (before
 * `persist` has anything to rehydrate from) — used as the reminder's
 * reference point until a real export happens, so a brand-new install
 * doesn't start the "N days since backup" clock from a fabricated zero.
 * Only the plain full JSON backup (`ExportSection.tsx`'s `handleExport`)
 * calls `recordExport` — the ranged/Excel/CSV/Markdown exports are partial
 * or non-restorable, so they shouldn't reset a reminder about the one
 * complete safety-net backup.
 */
interface LastBackupStoreState {
  firstSeenAt: string
  lastExportedAt: string | null
  dismissedUntil: string | null
  recordExport: () => void
  dismissReminder: (snoozeUntil: string) => void
}

export const useLastBackupStore = create<LastBackupStoreState>()(
  persist(
    (set) => ({
      firstSeenAt: new Date().toISOString(),
      lastExportedAt: null,
      dismissedUntil: null,
      recordExport: () =>
        set({ lastExportedAt: new Date().toISOString(), dismissedUntil: null }),
      dismissReminder: (snoozeUntil) => set({ dismissedUntil: snoozeUntil }),
    }),
    {
      name: 'turtle-steps-last-backup',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
