import type { DailyEntry } from '@/domain/dailyEntry'
import {
  hadNightEating,
  totalCalories,
  totalCarbs,
  totalFat,
  totalProtein,
  totalWaterMl,
} from '@/domain/dailyEntry'
import { fastingWindowPoints } from './fastingWindow'

export type NumericSeriesKey =
  | 'weight'
  | 'calories'
  | 'protein'
  | 'fat'
  | 'carbs'
  | 'water'
  | 'steps'
  | 'sleep'
  | 'waist'
  | 'hip'
  | 'bodyFat'
  | 'fastingHours'

export const NUMERIC_SERIES_KEYS: NumericSeriesKey[] = [
  'weight',
  'calories',
  'protein',
  'fat',
  'carbs',
  'water',
  'steps',
  'sleep',
  'waist',
  'hip',
  'bodyFat',
  'fastingHours',
]

// fastingHours (#257) isn't a plain per-entry property — it depends on the
// *previous* day's own last meal too, so it can't fit this per-entry
// extractor shape. Computed separately below via fastingWindowPoints and
// looked up by date instead, same "date -> value" map fastingHoursByDate
// builds once per customChartPoints call.
const SERIES_EXTRACTORS: Record<
  Exclude<NumericSeriesKey, 'fastingHours'>,
  (entry: DailyEntry) => number | undefined
> = {
  weight: (entry) => entry.weightKg,
  calories: (entry) => totalCalories(entry.calorieEntries, entry.dayTotals),
  protein: (entry) => totalProtein(entry.calorieEntries, entry.dayTotals),
  fat: (entry) => totalFat(entry.calorieEntries, entry.dayTotals),
  carbs: (entry) => totalCarbs(entry.calorieEntries, entry.dayTotals),
  water: (entry) => totalWaterMl(entry.waterEntries),
  steps: (entry) => entry.steps,
  // #440
  sleep: (entry) => entry.sleepHours,
  // #225
  waist: (entry) => entry.waistCm,
  hip: (entry) => entry.hipCm,
  bodyFat: (entry) => entry.bodyFatPercent,
}

export interface CustomChartPoint {
  date: string
  /** Actual logged value per series — what the tooltip shows. Undefined
   * for a series not logged that day. */
  raw: Partial<Record<NumericSeriesKey, number>>
  /** 0-100 within that series' own min/max across the visible range — lets
   * series with very different units/scales (weight in kg, calories in the
   * thousands, steps in the tens of thousands) share one Y-axis and stay
   * visually comparable, rather than the smaller ones flattening to
   * invisible lines next to the larger ones. Purely a plotting coordinate;
   * always read the actual number from `raw`, never this. */
  normalized: Partial<Record<NumericSeriesKey, number>>
}

/**
 * Builds one point per date (sorted ascending) with both the raw logged
 * value and a per-series-normalized 0-100 value, for each key in
 * `seriesKeys`. A series with only one distinct value across the range (or
 * zero variance) normalizes everything on it to 50 rather than dividing by
 * zero — a flat line at the midpoint, which is the honest representation
 * of "no variation," not a spike or a crash to 0.
 */
export function customChartPoints(
  entries: DailyEntry[],
  seriesKeys: NumericSeriesKey[],
): CustomChartPoint[] {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))

  const fastingHoursByDate = seriesKeys.includes('fastingHours')
    ? new Map(fastingWindowPoints(entries).map((p) => [p.date, p.fastingHours]))
    : null

  const rawByDate = new Map<string, Partial<Record<NumericSeriesKey, number>>>()
  for (const entry of sorted) {
    const values: Partial<Record<NumericSeriesKey, number>> = {}
    for (const key of seriesKeys) {
      const value =
        key === 'fastingHours'
          ? fastingHoursByDate?.get(entry.date)
          : SERIES_EXTRACTORS[key](entry)
      if (value !== undefined) values[key] = value
    }
    rawByDate.set(entry.date, values)
  }

  const ranges: Partial<Record<NumericSeriesKey, { min: number; max: number }>> =
    {}
  for (const key of seriesKeys) {
    const values = sorted
      .map((entry) => rawByDate.get(entry.date)?.[key])
      .filter((value): value is number => value !== undefined)
    if (values.length === 0) continue
    ranges[key] = { min: Math.min(...values), max: Math.max(...values) }
  }

  return sorted.map((entry) => {
    const raw = rawByDate.get(entry.date) ?? {}
    const normalized: Partial<Record<NumericSeriesKey, number>> = {}
    for (const key of seriesKeys) {
      const value = raw[key]
      const range = ranges[key]
      if (value === undefined || !range) continue
      normalized[key] =
        range.max === range.min
          ? 50
          : ((value - range.min) / (range.max - range.min)) * 100
    }
    return { date: entry.date, raw, normalized }
  })
}

/**
 * A single series' `date -> value` map across every entry that has it
 * (#336) — the per-entry building block `customCorrelationEngine.ts`'s
 * generic same-day pairing needs for a `MetricRef`'s built-in side, one
 * series at a time rather than `customChartPoints`' own "several series
 * at once, normalized for one shared chart" shape. `fastingHours` gets the
 * same cross-day special-case `customChartPoints` already needs (it isn't
 * a plain per-entry field — see `SERIES_EXTRACTORS`' own comment above).
 */
export function numericSeriesValueByDate(
  entries: DailyEntry[],
  key: NumericSeriesKey,
): Map<string, number> {
  if (key === 'fastingHours') {
    return new Map(
      fastingWindowPoints(entries).map((p) => [p.date, p.fastingHours]),
    )
  }
  const byDate = new Map<string, number>()
  for (const entry of entries) {
    const value = SERIES_EXTRACTORS[key](entry)
    if (value !== undefined) byDate.set(entry.date, value)
  }
  return byDate
}

/** Dates a boolean per-day flag (period, constipation, night eating) was on
 * — the marker-band data for the non-numeric series, kept separate from
 * `customChartPoints` since they're not plotted as a line. `nightEating`
 * isn't a plain field lookup like the other two — same derived-value
 * special-case `fastingHours` needs above, via `hadNightEating` rather than
 * `entry[flag]`. */
export function booleanFlagDates(
  entries: DailyEntry[],
  flag: 'onPeriod' | 'hadConstipation' | 'nightEating',
): string[] {
  if (flag === 'nightEating') {
    return entries.filter((entry) => hadNightEating(entry)).map((entry) => entry.date)
  }
  return entries.filter((entry) => entry[flag]).map((entry) => entry.date)
}

/** One marker dot for a boolean flag, standing for `dayCount` flagged days
 * starting at `date` (see `booleanFlagMarkers`). */
export interface BooleanFlagMarker {
  /** An x-axis date the dot is drawn on — always a genuinely flagged day,
   * the first one in its group. */
  date: string
  /** How many flagged days this single dot represents. 1 on short ranges,
   * where every flagged day still gets its own dot. */
  dayCount: number
}

/**
 * #502 — group a boolean flag's flagged days into at most `maxMarkers`
 * dots. A marker dot is ~8px wide, so on a multi-year x-axis (where a day
 * is a fraction of a pixel) one dot per flagged day overlapped its
 * neighbours into a solid band that read as "on period non-stop for
 * years". Grouping keeps the dots visually separate at any range: the axis
 * is walked in fixed-size windows, and each window that contains at least
 * one flagged day emits a single dot on its first flagged day, then skips
 * the rest of the window so consecutive dots can never sit adjacent.
 *
 * `axisDates` must be the chart's sorted x-axis categories — the window
 * size comes from how many of those fit between dots, not from calendar
 * distance, since that's what decides whether two dots overlap on screen.
 * When the axis is short enough that every flagged day fits (window size
 * 1), this returns exactly one `dayCount: 1` marker per flagged day, i.e.
 * the pre-#502 behavior.
 */
export function booleanFlagMarkers(
  axisDates: string[],
  flaggedDates: Iterable<string>,
  maxMarkers: number,
): BooleanFlagMarker[] {
  const flagged = flaggedDates instanceof Set ? flaggedDates : new Set(flaggedDates)
  const windowSize = Math.max(1, Math.ceil(axisDates.length / maxMarkers))
  const markers: BooleanFlagMarker[] = []
  let index = 0
  while (index < axisDates.length) {
    if (!flagged.has(axisDates[index])) {
      index += 1
      continue
    }
    const windowEnd = Math.min(index + windowSize, axisDates.length)
    let dayCount = 0
    for (let i = index; i < windowEnd; i += 1) {
      if (flagged.has(axisDates[i])) dayCount += 1
    }
    markers.push({ date: axisDates[index], dayCount })
    index = windowEnd
  }
  return markers
}
