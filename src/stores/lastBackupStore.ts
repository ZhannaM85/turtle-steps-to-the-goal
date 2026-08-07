import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/**
 * Tracks JSON backup export recency (#599) — a local UI preference, same
 * category as unit/theme, not part of the export bundle itself (a backup
 * of "when you last made a backup" would be circular). `firstSeenAt`
 * defaults to "now" the very first time this store is ever created (before
 * `persist` has anything to rehydrate from) — used as the reminder's
 * reference point until a real export happens. `useSeedBackupFirstSeenAt`
 * (`shared/hooks/`) corrects this to the earliest logged `DailyEntry`
 * date shortly after mount, whenever that's earlier — a real usage
 * signal, rather than "whenever this device happened to first create the
 * store," which for an existing user is the day they updated to this
 * feature, not the day they actually started using the app un-backed-up
 * (reported live 2026-08-06: an existing user with ~1 month of history
 * saw no reminder because the clock silently restarted at zero on
 * update). Only ever moves earlier, never later, so it's safe to call on
 * every mount and self-heals an already-affected install. Only the plain
 * full JSON backup (`ExportSection.tsx`'s `handleExport`) calls
 * `recordExport` — the ranged/Excel/CSV/Markdown exports are partial or
 * non-restorable, so they shouldn't reset a reminder about the one
 * complete safety-net backup.
 */
interface LastBackupStoreState {
  firstSeenAt: string
  lastExportedAt: string | null
  dismissedUntil: string | null
  recordExport: () => void
  dismissReminder: (snoozeUntil: string) => void
  backdateFirstSeenAt: (isoDate: string) => void
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
      backdateFirstSeenAt: (isoDate) =>
        set((state) =>
          isoDate < state.firstSeenAt ? { firstSeenAt: isoDate } : {},
        ),
    }),
    {
      name: 'turtle-steps-last-backup',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
