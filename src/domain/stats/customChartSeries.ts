import type { DailyEntry } from '@/domain/dailyEntry'
import { totalCalories, totalCarbs, totalFat, totalProtein } from '@/domain/dailyEntry'

export type NumericSeriesKey =
  | 'weight'
  | 'calories'
  | 'protein'
  | 'fat'
  | 'carbs'
  | 'steps'

export const NUMERIC_SERIES_KEYS: NumericSeriesKey[] = [
  'weight',
  'calories',
  'protein',
  'fat',
  'carbs',
  'steps',
]

const SERIES_EXTRACTORS: Record<
  NumericSeriesKey,
  (entry: DailyEntry) => number | undefined
> = {
  weight: (entry) => entry.weightKg,
  calories: (entry) => totalCalories(entry.calorieEntries),
  protein: (entry) => totalProtein(entry.calorieEntries),
  fat: (entry) => totalFat(entry.calorieEntries),
  carbs: (entry) => totalCarbs(entry.calorieEntries),
  steps: (entry) => entry.steps,
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

  const rawByDate = new Map<string, Partial<Record<NumericSeriesKey, number>>>()
  for (const entry of sorted) {
    const values: Partial<Record<NumericSeriesKey, number>> = {}
    for (const key of seriesKeys) {
      const value = SERIES_EXTRACTORS[key](entry)
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

/** Dates a boolean per-day flag (period, constipation) was on — the
 * marker-band data for the two non-numeric series, kept separate from
 * `customChartPoints` since they're not plotted as a line. */
export function booleanFlagDates(
  entries: DailyEntry[],
  flag: 'onPeriod' | 'hadConstipation',
): string[] {
  return entries.filter((entry) => entry[flag]).map((entry) => entry.date)
}
