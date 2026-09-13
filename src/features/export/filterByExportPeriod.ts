/** #240 — Excel/CSV/Markdown only, never the JSON backup (a backup should
 * stay complete). Blank start/end means "no lower/upper bound", so leaving
 * both blank exports everything, matching the pre-#240 behavior exactly. */
export function filterByExportPeriod<T extends { date: string }>(
  entries: T[],
  start: string,
  end: string,
): T[] {
  if (!start && !end) return entries
  return entries.filter(
    (entry) => (!start || entry.date >= start) && (!end || entry.date <= end),
  )
}
