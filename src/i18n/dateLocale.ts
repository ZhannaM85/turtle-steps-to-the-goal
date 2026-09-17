import { format, parseISO } from 'date-fns'
import { enUS, ru } from 'date-fns/locale'
import type { Locale as DateFnsLocale } from 'date-fns'
import type { Locale } from './localeStore'

/** date-fns locale object for human-readable date formatting (month names, weekday labels, etc). */
export function getDateFnsLocale(locale: Locale): DateFnsLocale {
  return locale === 'ru' ? ru : enUS
}

function parseIsoDate(isoDate: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null
  const parsed = parseISO(isoDate)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

/** Closed-state / user-visible date — Settings language, date-fns `PP`. */
export function formatLocalizedDate(isoDate: string, locale: Locale): string {
  const parsed = parseIsoDate(isoDate)
  if (!parsed) return ''
  return format(parsed, 'PP', { locale: getDateFnsLocale(locale) })
}

/**
 * #957 — same `PP` path as `formatLocalizedDate`. Kept as an alias so chart
 * callers do not invent a second numeric format (`P` / MM/DD/YYYY).
 */
export function formatLocalizedShortDate(
  isoDate: string,
  locale: Locale,
): string {
  return formatLocalizedDate(isoDate, locale)
}

/** Start–end range using the same `PP` helper (dashboard pagers, etc.). */
export function formatLocalizedDateRange(
  startIso: string,
  endIso: string,
  locale: Locale,
): string {
  const start = formatLocalizedDate(startIso, locale)
  const end = formatLocalizedDate(endIso, locale)
  if (!start) return end
  if (!end) return start
  return `${start} – ${end}`
}

/** #957 — 11px axis labels; ~one `PP` date between tick coordinates. */
export const CHART_DATE_TICK_MIN_GAP_PX = 104
const CHART_DATE_TICK_CHAR_PX = 6.5
const CHART_DATE_TICK_PADDING_PX = 8

export type ChartDateTickAnchor = 'start' | 'middle' | 'end'

export function estimateChartDateTickWidthPx(label: string): number {
  return Math.max(Math.ceil(label.length * CHART_DATE_TICK_CHAR_PX), 8)
}

function tickBounds(
  x: number,
  width: number,
  anchor: ChartDateTickAnchor,
): { left: number; right: number } {
  if (anchor === 'start') return { left: x, right: x + width }
  if (anchor === 'end') return { left: x - width, right: x }
  const half = width / 2
  return { left: x - half, right: x + half }
}

function ticksOverlap(
  a: { left: number; right: number },
  b: { left: number; right: number },
  minGapPx: number,
): boolean {
  return a.right + minGapPx > b.left && b.right + minGapPx > a.left
}

/**
 * #957 — keep first and last ticks; drop interiors whose `PP` labels would
 * collide. Never invent a shorter numeric date to squeeze more labels in.
 */
export function selectNonOverlappingDateTicks<T>(
  ticks: readonly T[],
  options: {
    getLabel: (tick: T) => string
    getX: (tick: T) => number
    getAnchor?: (
      tick: T,
      index: number,
      ticks: readonly T[],
    ) => ChartDateTickAnchor
    minGapPx?: number
  },
): T[] {
  if (ticks.length <= 1) return [...ticks]
  const minGapPx = options.minGapPx ?? CHART_DATE_TICK_PADDING_PX
  const getAnchor =
    options.getAnchor ??
    ((_tick, index, all) =>
      index === 0 ? 'start' : index === all.length - 1 ? 'end' : 'middle')
  const lastIndex = ticks.length - 1
  const last = ticks[lastIndex]!
  const lastBounds = tickBounds(
    options.getX(last),
    estimateChartDateTickWidthPx(options.getLabel(last)),
    getAnchor(last, lastIndex, ticks),
  )
  const first = ticks[0]!
  const selected: T[] = [first]
  const selectedBounds = [
    tickBounds(
      options.getX(first),
      estimateChartDateTickWidthPx(options.getLabel(first)),
      getAnchor(first, 0, ticks),
    ),
  ]
  for (let i = 1; i < lastIndex; i += 1) {
    const tick = ticks[i]!
    const bounds = tickBounds(
      options.getX(tick),
      estimateChartDateTickWidthPx(options.getLabel(tick)),
      getAnchor(tick, i, ticks),
    )
    const previous = selectedBounds[selectedBounds.length - 1]!
    if (ticksOverlap(previous, bounds, minGapPx)) continue
    if (ticksOverlap(bounds, lastBounds, minGapPx)) continue
    selected.push(tick)
    selectedBounds.push(bounds)
  }
  selected.push(last)
  return selected
}
