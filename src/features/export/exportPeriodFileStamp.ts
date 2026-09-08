import { format, subDays, subMonths, subYears } from 'date-fns'

/**
 * Date stamp for period-aware export filenames (#822).
 *
 * Blank from/to (no data yet, or an unbounded custom range) keeps today's
 * calendar date, matching the pre-#822 `turtle-steps-daily-log-YYYY-MM-DD`
 * default. A selected range uses ISO from-to so several period copies in
 * Files are distinguishable. #830 fills All with first-logged-day → today
 * so it no longer falls through to the today-only stamp.
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

export type ExportRangePreset = 'week' | 'month' | 'year' | 'all' | 'custom'

/** Trailing bounds for #819 pills, ending today (#827). `custom` is the date fields.
 *  #830: All is first logged day → today when `earliestEntryDate` is known. */
export function exportPeriodForPreset(
  preset: Exclude<ExportRangePreset, 'custom'>,
  today: Date = new Date(),
  earliestEntryDate?: string,
): { start: string; end: string } {
  const iso = (d: Date) => format(d, 'yyyy-MM-dd')
  if (preset === 'all') {
    const start = earliestEntryDate?.trim() ?? ''
    if (!start) return { start: '', end: '' }
    return { start, end: iso(today) }
  }
  const end = iso(today)
  if (preset === 'week') {
    return { start: iso(subDays(today, 6)), end }
  }
  if (preset === 'month') {
    return { start: iso(subMonths(today, 1)), end }
  }
  return { start: iso(subYears(today, 1)), end }
}

export function defaultDailyLogStem(
  periodStart: string,
  periodEnd: string,
  today: Date = new Date(),
): string {
  return `turtle-steps-daily-log-${exportPeriodFileStamp(periodStart, periodEnd, today)}`
}

/** Stem for the download `a[download]` (#821). Empty / whitespace uses the default. */
export function resolveExportFileStem(
  raw: string,
  periodStart: string,
  periodEnd: string,
  today: Date = new Date(),
): string {
  let stem = raw.trim().replace(/[\\/:*?"<>|]+/g, '-')
  stem = stem.replace(/\.(csv|md|xlsx|json|pdf)$/i, '')
  return stem || defaultDailyLogStem(periodStart, periodEnd, today)
}
