import { format } from 'date-fns'

/**
 * Date stamp for period-aware export filenames (#822).
 *
 * Blank from/to (full / unbounded period) keeps today's calendar date, matching
 * the pre-#822 `turtle-steps-daily-log-YYYY-MM-DD` default. A selected range
 * uses ISO from-to so several period copies in Files are distinguishable.
 */
export function exportPeriodFileStamp(
  periodStart: string,
  periodEnd: string,
  today: Date = new Date(),
): string {
  const start = periodStart.trim()
  const end = periodEnd.trim()
  if (start && end) {
    if (start === end) return start
    return `${start}-to-${end}`
  }
  if (start) return `${start}-onward`
  if (end) return `until-${end}`
  return format(today, 'yyyy-MM-dd')
}
