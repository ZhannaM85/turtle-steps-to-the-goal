/** Sleep is stored as decimal hours (`sleepHours`/`deepSleepHours`), but
 * reads unnaturally that way ("9.4 hours") compared to how people actually
 * think and talk about it ("9h 23m") — the same reasoning #69 already used
 * for `DailyEntryForm.tsx`'s own hours+minutes input fields, now shared so
 * read-only displays (`TodayScreen.tsx`'s Sleep `StatCard`, #358) can use
 * the identical conversion instead of showing the raw decimal. */
export function splitHoursMinutes(value: number | undefined): {
  hours: string
  minutes: string
} {
  if (value === undefined) return { hours: '', minutes: '' }
  const hours = Math.floor(value)
  const minutes = Math.round((value - hours) * 60)
  return { hours: String(hours), minutes: String(minutes) }
}

/** `formatSleepDuration(9.383, 'h', 'm')` -> `'9h 23m'`. */
export function formatSleepDuration(
  value: number,
  hoursUnit: string,
  minutesUnit: string,
): string {
  const { hours, minutes } = splitHoursMinutes(value)
  return `${hours}${hoursUnit} ${minutes}${minutesUnit}`
}
