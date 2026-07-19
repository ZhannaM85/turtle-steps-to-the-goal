import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/**
 * Opt-in "haven't logged today" reminder (#171) — off by default, a
 * local-only UI preference like cycleTrackingStore/digestionTrackingStore.
 * Deliberately just an in-app banner on Today (see TodayScreen.tsx), not
 * a real OS push notification — this app has no backend to schedule a
 * push from, and the existing no-pressure design ethos (no streaks or
 * badges, see #14/#20/#29 in docs/issues-priority.md) ruled out anything
 * that could read as nagging.
 */
interface DailyReminderStoreState {
  enabled: boolean
  setEnabled: (enabled: boolean) => void
}

export const useDailyReminderStore = create<DailyReminderStoreState>()(
  persist(
    (set) => ({
      enabled: false,
      setEnabled: (enabled) => set({ enabled }),
    }),
    {
      name: 'turtle-steps-daily-reminder',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
