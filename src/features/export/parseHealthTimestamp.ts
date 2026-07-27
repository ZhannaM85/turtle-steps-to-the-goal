import { format } from 'date-fns'

export interface HealthTimestamp {
  /** The calendar date this instant falls on in the browser's local
   * timezone, matching how every other date in this app (manually-logged
   * entries, "today") is a plain local calendar day rather than a UTC or
   * source-device one. */
  localDate: string
  /** Milliseconds since epoch — for chronological comparisons (e.g. "which
   * of two same-day readings is newer"). Not safe to compare the raw
   * strings themselves: Zepp's CSV always uses a fixed `+0000` offset, but
   * Apple Health's `creationDate`/`startDate`/`endDate` can carry a
   * *different* offset per record (the source device's timezone at the
   * time, which changes across DST or travel) — two instants with
   * different offsets don't sort correctly as plain strings. */
  epochMs: number
}

/**
 * Parses the `YYYY-MM-DD HH:mm:ss±ZZZZ` timestamp format both Zepp Life's
 * CSV export (`time`, e.g. `2026-01-15 12:00:00+0000`, no space before the
 * offset) and Apple Health's XML export (`creationDate`/`startDate`/
 * `endDate`, e.g. `2026-01-15 12:00:00 +0300` — confirmed from a real
 * sample to have a space before the offset, unlike Zepp's) use — neither
 * is strict ISO 8601, so both need normalizing before `new Date()`.
 */
export function parseHealthTimestamp(raw: string): HealthTimestamp {
  const isoish = raw
    .replace(' ', 'T')
    .replace(/\s*([+-]\d{2})(\d{2})$/, '$1:$2')
  const date = new Date(isoish)
  return {
    localDate: format(date, 'yyyy-MM-dd'),
    epochMs: date.getTime(),
  }
}
