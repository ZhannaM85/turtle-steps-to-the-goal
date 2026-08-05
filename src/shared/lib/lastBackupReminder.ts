/** Days of silence before the JSON-backup reminder starts showing (#599) —
 * long enough that routine day-to-day use never nags, short enough that a
 * genuinely stale backup gets flagged well before it's forgotten. */
export const BACKUP_REMINDER_THRESHOLD_DAYS = 14

/** How long "Dismiss" snoozes the reminder before it can reappear. */
export const BACKUP_REMINDER_SNOOZE_DAYS = 7

export interface LastBackupState {
  firstSeenAt: string
  lastExportedAt: string | null
  dismissedUntil: string | null
}

export function daysSince(iso: string, now: Date): number {
  const ms = now.getTime() - new Date(iso).getTime()
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)))
}

/**
 * Whether to show the reminder right now, and how many days it's been
 * since the last real backup (`null` when one has never happened, in
 * which case the reminder counts from `firstSeenAt` instead but still
 * reports `days: null` — the copy shown for that case doesn't need a
 * number, just "you haven't backed up yet"). A live snooze always wins,
 * regardless of how stale the backup is.
 */
export function backupReminderStatus(
  state: LastBackupState,
  now: Date,
): { show: boolean; days: number | null } {
  if (
    state.dismissedUntil !== null &&
    new Date(state.dismissedUntil).getTime() > now.getTime()
  ) {
    return { show: false, days: null }
  }
  const referenceIso = state.lastExportedAt ?? state.firstSeenAt
  const show = daysSince(referenceIso, now) >= BACKUP_REMINDER_THRESHOLD_DAYS
  const days = state.lastExportedAt === null ? null : daysSince(state.lastExportedAt, now)
  return { show, days }
}
