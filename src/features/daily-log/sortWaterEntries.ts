import type { WaterEntry } from '@/domain/dailyEntry'

/** Minutes since midnight for a stored "H:MM" / "HH:MM" clock, or undefined. */
function clockMinutes(timeDrunk: string | undefined): number | undefined {
  const value = timeDrunk?.trim()
  if (!value) return undefined
  const match = /^(\d{1,2}):(\d{2})$/.exec(value)
  if (!match) return undefined
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return undefined
  return hours * 60 + minutes
}

/**
 * #985 — Day water chips, earliest clock first (08:02, then 10:33, then
 * 11:33). Display order only: callers sort a copy. Untimed or unreadable
 * clocks stay after timed ones. Equal times keep their previous order.
 */
export function sortWaterEntriesByTime(
  entries: readonly WaterEntry[],
): WaterEntry[] {
  return entries
    .map((entry, index) => ({
      entry,
      index,
      minutes: clockMinutes(entry.timeDrunk),
    }))
    .sort((a, b) => {
      if (a.minutes == null && b.minutes == null) return a.index - b.index
      if (a.minutes == null) return 1
      if (b.minutes == null) return -1
      return a.minutes !== b.minutes
        ? a.minutes - b.minutes
        : a.index - b.index
    })
    .map(({ entry }) => entry)
}
