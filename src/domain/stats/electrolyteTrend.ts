import type { DailyEntry } from '@/domain/dailyEntry'
import {
  totalMagnesium,
  totalPotassium,
  totalSodium,
} from '@/domain/dailyEntry'

export type ElectrolyteSeriesKey = 'sodium' | 'potassium' | 'magnesium'

export const ELECTROLYTE_SERIES_KEYS: ElectrolyteSeriesKey[] = [
  'sodium',
  'potassium',
  'magnesium',
]

export interface ElectrolytePoint {
  date: string
  /** Actual day totals in mg — what the tooltip shows. */
  raw: Partial<Record<ElectrolyteSeriesKey, number>>
  /** 0–100 within that series' own min/max across the visible range —
   * sodium/potassium/magnesium sit on different mg scales, so raw values
   * on one axis would flatten magnesium. Same idea as bodyCompositionPoints. */
  normalized: Partial<Record<ElectrolyteSeriesKey, number>>
}

function dayTotals(entry: DailyEntry): Partial<Record<ElectrolyteSeriesKey, number>> {
  return {
    sodium: totalSodium(entry.calorieEntries),
    potassium: totalPotassium(entry.calorieEntries),
    magnesium: totalMagnesium(entry.calorieEntries),
  }
}

/**
 * #530 — one point per day that logged at least one electrolyte total,
 * sorted ascending, with raw mg and per-series normalized 0–100 values.
 */
export function electrolytePoints(entries: DailyEntry[]): ElectrolytePoint[] {
  const sorted = [...entries]
    .map((entry) => ({ date: entry.date, raw: dayTotals(entry) }))
    .filter((row) =>
      ELECTROLYTE_SERIES_KEYS.some((key) => row.raw[key] !== undefined),
    )
    .sort((a, b) => a.date.localeCompare(b.date))

  const ranges: Partial<
    Record<ElectrolyteSeriesKey, { min: number; max: number }>
  > = {}
  for (const key of ELECTROLYTE_SERIES_KEYS) {
    const values = sorted
      .map((row) => row.raw[key])
      .filter((value): value is number => value !== undefined)
    if (values.length === 0) continue
    ranges[key] = { min: Math.min(...values), max: Math.max(...values) }
  }

  return sorted.map((row) => {
    const normalized: Partial<Record<ElectrolyteSeriesKey, number>> = {}
    for (const key of ELECTROLYTE_SERIES_KEYS) {
      const value = row.raw[key]
      const range = ranges[key]
      if (value === undefined || !range) continue
      normalized[key] =
        range.max === range.min
          ? 50
          : ((value - range.min) / (range.max - range.min)) * 100
    }
    return { date: row.date, raw: row.raw, normalized }
  })
}
