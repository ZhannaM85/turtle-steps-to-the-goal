import { LocalNotifications } from '@capacitor/local-notifications'
import { Capacitor } from '@capacitor/core'
import { getDictionary, useLocaleStore } from '@/i18n'
import { useDailyReminderStore } from '@/stores'

const NOTIFICATION_ID = 1717

/**
 * #605 — wires #171's existing daily-reminder preference to a real OS
 * notification now that a native shell exists (#305+). Web/PWA keeps the
 * existing in-app-only banner (`TodayScreen.tsx`) unchanged — there's no
 * reliable way to fire anything there while the app isn't open. Runs
 * outside the React tree (same as `backButtonHandler`/
 * `registerServiceWorker`), so translated copy comes from
 * `getDictionary()` directly rather than the `useTranslation()` hook.
 *
 * Deliberately unconditional — fires every day at `reminderTime`
 * regardless of whether today's entry already exists, unlike the in-app
 * banner's own "only if entry === null" gating. A background OS
 * notification has no way to check IndexedDB state at delivery time
 * without a second plugin for background tasks, well beyond this
 * issue's scope — the notification copy is written to stay neutral
 * rather than presuppose "no entry yet."
 */
export function initDailyReminderNotification() {
  if (!Capacitor.isNativePlatform()) return

  const sync = () => void syncSchedule()
  sync()
  useDailyReminderStore.subscribe(sync)
  // Re-schedules with the new language's copy on a locale change,
  // rather than leaving a stale-language notification title/body
  // sitting scheduled until the reminder is toggled off and back on.
  useLocaleStore.subscribe(sync)
}

async function syncSchedule() {
  await LocalNotifications.cancel({
    notifications: [{ id: NOTIFICATION_ID }],
  })

  const { enabled, reminderTime } = useDailyReminderStore.getState()
  if (!enabled) return

  const permitted = await ensurePermission()
  if (!permitted) return

  const [hour, minute] = reminderTime.split(':').map(Number)
  const t = getDictionary(useLocaleStore.getState().locale)

  await LocalNotifications.schedule({
    notifications: [
      {
        id: NOTIFICATION_ID,
        title: t.today.dailyReminderNotificationTitle,
        body: t.today.dailyReminderNotificationBody,
        schedule: { on: { hour, minute } },
      },
    ],
  })
}

async function ensurePermission(): Promise<boolean> {
  const status = await LocalNotifications.checkPermissions()
  if (status.display === 'granted') return true
  const requested = await LocalNotifications.requestPermissions()
  return requested.display === 'granted'
}
