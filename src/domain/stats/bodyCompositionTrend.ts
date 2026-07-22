import type { DailyEntry } from '@/domain/dailyEntry'

export type BodyCompositionSeriesKey =
  | 'muscleMassKg'
  | 'visceralFatRating'
  | 'bodyWaterPercent'
  | 'boneMassKg'
  | 'bodyFatPercent'

export const BODY_COMPOSITION_SERIES_KEYS: BodyCompositionSeriesKey[] = [
  'muscleMassKg',
  'visceralFatRating',
  'bodyWaterPercent',
  'boneMassKg',
  'bodyFatPercent',
]

export interface BodyCompositionPoint {
  date: string
  /** Actual logged value per series — what the tooltip shows. */
  raw: Partial<Record<BodyCompositionSeriesKey, number>>
  /** 0-100 within that series' own min/max across the visible range — these
   * five fields span wildly different units/scales (kg for muscle/bone,
   * % for water/body fat, an unscaled 1-59 rating for visceral fat), so
   * plotting the raw numbers together on one axis would flatten the
   * smaller ones to invisible lines next to the larger ones. Same
   * normalization idea `domain/stats/customChartSeries.ts` already uses
   * for its generic, user-selectable series — kept as its own standalone
   * function here rather than sharing that module's public
   * `NumericSeriesKey` union, since this chart always plots this fixed
   * set (#267), not a user-picked one. Purely a plotting coordinate;
   * always read the actual number from `raw`, never this. */
  normalized: Partial<Record<BodyCompositionSeriesKey, number>>
}

/**
 * One point per day that logged at least one of the five fields (#267),
 * sorted ascending, each with both its raw value and a per-series 0-100
 * normalized value. A series with only one distinct value across the
 * range (or zero variance) normalizes everything on it to 50 rather than
 * dividing by zero — a flat line at the midpoint, the honest
 * representation of "no variation," not a spike or a crash to 0.
 */
export function bodyCompositionPoints(
  entries: DailyEntry[],
): BodyCompositionPoint[] {
  const sorted = [...entries]
    .filter((entry) =>
      BODY_COMPOSITION_SERIES_KEYS.some((key) => entry[key] !== undefined),
    )
    .sort((a, b) => a.date.localeCompare(b.date))

  const rawByDate = new Map<
    string,
    Partial<Record<BodyCompositionSeriesKey, number>>
  >()
  for (const entry of sorted) {
    rawByDate.set(entry.date, {
      muscleMassKg: entry.muscleMassKg,
      visceralFatRating: entry.visceralFatRating,
      bodyWaterPercent: entry.bodyWaterPercent,
      boneMassKg: entry.boneMassKg,
      bodyFatPercent: entry.bodyFatPercent,
    })
  }

  const ranges: Partial<
    Record<BodyCompositionSeriesKey, { min: number; max: number }>
  > = {}
  for (const key of BODY_COMPOSITION_SERIES_KEYS) {
    const values = sorted
      .map((entry) => rawByDate.get(entry.date)?.[key])
      .filter((value): value is number => value !== undefined)
    if (values.length === 0) continue
    ranges[key] = { min: Math.min(...values), max: Math.max(...values) }
  }

  return sorted.map((entry) => {
    const raw = rawByDate.get(entry.date) ?? {}
    const normalized: Partial<Record<BodyCompositionSeriesKey, number>> = {}
    for (const key of BODY_COMPOSITION_SERIES_KEYS) {
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
