import { App } from '@capacitor/app'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Capacitor } from '@capacitor/core'
import { format } from 'date-fns'
import { getDictionary, useLocaleStore } from '@/i18n'
import { IndexedDbDailyEntryRepository } from '@/infrastructure/persistence/indexeddb'
import { useDailyEntryStore, useDailyReminderStore } from '@/stores'
import { nextDailyReminderAt } from './dailyReminderSchedule'

const NOTIFICATION_ID = 1717
const dailyEntryRepository = new IndexedDbDailyEntryRepository()

/**
 * #605 / #1108 — wires #171's daily-reminder preference to a real OS
 * notification on native. Web/PWA keeps the in-app banner only
 * (`TodayScreen.tsx`).
 *
 * #1108: schedule a **one-shot** for the next eligible fire (skip today
 * when a `DailyEntry` already exists — same gate as the in-app banner's
 * `entry === null`). Reschedule on preference/locale changes, after any
 * entry save, and when the app returns to the foreground so we never
 * leave a repeating calendar trigger that ignores IndexedDB.
 */
export function initDailyReminderNotification() {
  if (!Capacitor.isNativePlatform()) return

  const sync = () => void syncSchedule()
  sync()
  useDailyReminderStore.subscribe(sync)
  useLocaleStore.subscribe(sync)
  useDailyEntryStore.subscribe(sync)
  void App.addListener('appStateChange', ({ isActive }) => {
    if (isActive) sync()
  })
  // After a one-shot fires, queue the next eligible day while the app
  // is (or becomes) able to run JS.
  void LocalNotifications.addListener('localNotificationReceived', () => {
    sync()
  })
}

async function syncSchedule() {
  await LocalNotifications.cancel({
    notifications: [{ id: NOTIFICATION_ID }],
  })

  const { enabled, reminderTime } = useDailyReminderStore.getState()
  if (!enabled) return

  const permitted = await ensurePermission()
  if (!permitted) return

  const today = format(new Date(), 'yyyy-MM-dd')
  let todayHasEntry = false
  try {
    todayHasEntry =
      (await dailyEntryRepository.getByDate(today)) !== undefined
  } catch {
    // IndexedDB may not be ready on the first cold-start tick; treat as
    // empty so we still schedule rather than dropping the reminder.
  }
  const at = nextDailyReminderAt(new Date(), reminderTime, todayHasEntry)
  if (!at) return

  const t = getDictionary(useLocaleStore.getState().locale)

  await LocalNotifications.schedule({
    notifications: [
      {
        id: NOTIFICATION_ID,
        title: t.today.dailyReminderNotificationTitle,
        body: t.today.dailyReminderNotificationBody,
        schedule: { at, repeats: false },
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
