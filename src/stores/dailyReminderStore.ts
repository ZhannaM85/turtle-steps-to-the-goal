import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/**
 * Opt-in "haven't logged today" reminder (#171) — off by default, a
 * local-only UI preference like cycleTrackingStore/digestionTrackingStore.
 * Originally just an in-app banner on Today (see TodayScreen.tsx) — no
 * real OS push notification was possible without a backend to schedule
 * one from. **#605**: now that a native shell exists (#305+),
 * `shared/native/dailyReminderNotification.ts` also schedules a real
 * local notification at `reminderTime` on native platforms; the in-app
 * banner is unchanged and still the only surface on web/PWA. Still kept
 * deliberately quiet — no streaks/badges (#14/#20/#29).
 */
interface DailyReminderStoreState {
  enabled: boolean
  setEnabled: (enabled: boolean) => void
  /** 'HH:MM', 24-hour. Only consulted on native (#605) — the in-app
   * banner has no time of its own, it just shows whenever Today has no
   * entry yet. Default 8 PM, a reasonable end-of-day nudge. */
  reminderTime: string
  setReminderTime: (reminderTime: string) => void
}

export const useDailyReminderStore = create<DailyReminderStoreState>()(
  persist(
    (set) => ({
      enabled: false,
      setEnabled: (enabled) => set({ enabled }),
      reminderTime: '20:00',
      setReminderTime: (reminderTime) => set({ reminderTime }),
    }),
    {
      name: 'turtle-steps-daily-reminder',
      storage: createJSONStorage(() => localStorage),
      // Older persisted blobs only had `enabled` — merge keeps the new
      // #605 field's default for them rather than requiring a version
      // bump, same pattern dayStartStore's own #539 addition used.
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as Partial<DailyReminderStoreState>),
      }),
    },
  ),
)
