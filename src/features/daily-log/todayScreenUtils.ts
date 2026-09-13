import { addDays, format, parseISO } from 'date-fns'

export function shiftDate(date: string, days: number) {
  return format(addDays(parseISO(date), days), 'yyyy-MM-dd')
}

// #647 — feature-detect (not UA-sniff) WebKit specifically: `-webkit-
// touch-callout` is a real, still-unimplemented-elsewhere CSS property
// WebKit alone supports. `window.CSS` (not the bare global) since
// TodayScreen also imports `CSS` from `@dnd-kit/utilities`.
export const isWebKitEngine =
  typeof window !== 'undefined' &&
  typeof window.CSS?.supports === 'function' &&
  window.CSS.supports('-webkit-touch-callout', 'none')
