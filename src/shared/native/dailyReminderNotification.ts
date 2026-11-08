import { App } from '@capacitor/app'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Capacitor } from '@capacitor/core'
import { format } from 'date-fns'
import { getDictionary, useLocaleStore } from '@/i18n'
import { IndexedDbDailyEntryRepository } from '@/infrastructure/persistence/indexeddb'
import { useDailyEntryStore, useDailyReminderStore } from '@/stores'
import {
  nextDailyReminderAt,
  resolveTodayHasEntry,
} from './dailyReminderSchedule'

const NOTIFICATION_ID = 1717
const dailyEntryRepository = new IndexedDbDailyEntryRepository()

/** Monotonic token so overlapping syncs cannot leave a stale today-fire. */
let syncGeneration = 0

/**
 * #605 / #1108 / #1123 — wires #171's daily-reminder preference to a real OS
 * notification on native. Web/PWA keeps the in-app banner only
 * (`TodayScreen.tsx`).
 *
 * Schedule a **one-shot** for the next eligible fire (skip today when a
 * `DailyEntry` already exists — same gate as the in-app banner's
 * `entry === null`). Reschedule on preference/locale changes, after any
 * entry save, and when the app returns to the foreground so we never
 * leave a repeating calendar trigger that ignores IndexedDB.
 *
 * #1123: serialize overlapping syncs; if IndexedDB is not readable yet,
 * cancel and wait for a later sync instead of optimistically scheduling
 * today's fire (that race re-nagged after a log on App Store 1.0.1).
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
  const generation = ++syncGeneration

  await cancelOurs()
  if (generation !== syncGeneration) return

  const { enabled, reminderTime } = useDailyReminderStore.getState()
  if (!enabled) return

  const permitted = await ensurePermission()
  if (generation !== syncGeneration) return
  if (!permitted) return

  const today = format(new Date(), 'yyyy-MM-dd')
  const store = useDailyEntryStore.getState()

  let repositoryEntry: 'yes' | 'no' | 'unavailable'
  try {
    repositoryEntry =
      (await dailyEntryRepository.getByDate(today)) !== undefined
        ? 'yes'
        : 'no'
  } catch {
    repositoryEntry = 'unavailable'
  }
  if (generation !== syncGeneration) return

  const hasEntry = resolveTodayHasEntry({
    today,
    storeDate: store.date,
    storeHasEntry: store.entry !== null,
    repositoryEntry,
  })
  // IndexedDB not ready and the store isn't on today — leave cancelled;
  // a later load/foreground sync will schedule correctly.
  if (hasEntry === 'unknown') return

  const at = nextDailyReminderAt(new Date(), reminderTime, hasEntry === 'yes')
  if (!at) return
  if (generation !== syncGeneration) return

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

async function cancelOurs() {
  await LocalNotifications.cancel({
    notifications: [{ id: NOTIFICATION_ID }],
  })
  // Belt-and-suspenders for leftover #605 repeating / duplicate pendings
  // that share our id across App Store updates.
  try {
    const pending = await LocalNotifications.getPending()
    const ours = pending.notifications.filter((n) => n.id === NOTIFICATION_ID)
    if (ours.length > 0) {
      await LocalNotifications.cancel({
        notifications: ours.map((n) => ({ id: n.id })),
      })
    }
  } catch {
    // getPending can fail on some web stubs; cancel-by-id above is enough.
  }
}

async function ensurePermission(): Promise<boolean> {
  const status = await LocalNotifications.checkPermissions()
  if (status.display === 'granted') return true
  const requested = await LocalNotifications.requestPermissions()
  return requested.display === 'granted'
}
