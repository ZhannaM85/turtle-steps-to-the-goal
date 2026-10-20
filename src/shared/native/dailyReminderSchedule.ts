/**
 * #1108 — next fire time for the daily reminder LocalNotification.
 * One-shot scheduling (not a repeating `on: { hour, minute }`) so we can
 * skip days that already have a diary entry — OS delivery can't read IndexedDB.
 */

/** Parse `HH:MM` (24h). Returns null if malformed. */
export function parseReminderTime(
  reminderTime: string,
): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(reminderTime.trim())
  if (!match) return null
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null
  }
  return { hour, minute }
}

function atLocalTime(base: Date, hour: number, minute: number): Date {
  const d = new Date(base)
  d.setHours(hour, minute, 0, 0)
  return d
}

function addLocalDays(base: Date, days: number): Date {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return d
}

/**
 * Next datetime to fire the reminder.
 * - If today already has a `DailyEntry` → tomorrow at reminder time.
 * - Else if reminder time today is still ahead → today at that time.
 * - Else → tomorrow at that time.
 */
export function nextDailyReminderAt(
  now: Date,
  reminderTime: string,
  todayHasEntry: boolean,
): Date | null {
  const parsed = parseReminderTime(reminderTime)
  if (!parsed) return null
  const { hour, minute } = parsed
  const todayAt = atLocalTime(now, hour, minute)
  if (todayHasEntry || now.getTime() >= todayAt.getTime()) {
    return atLocalTime(addLocalDays(now, 1), hour, minute)
  }
  return todayAt
}
