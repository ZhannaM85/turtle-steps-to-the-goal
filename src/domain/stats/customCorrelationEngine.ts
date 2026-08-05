import type { CustomMetricEntry, MetricRef } from '@/domain/customMetric'
import type { DailyEntry } from '@/domain/dailyEntry'
import {
  classifyRelativeCorrelationStrength,
  type CorrelationStrength,
} from './correlationStrength'
import { numericSeriesValueByDate } from './customChartSeries'

const MIN_COMPARABLE_DAYS = 8

function average(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

/** One calendar day where both sides of a `CustomCorrelation` have a
 * logged value (#336) — same-day, unlike every other correlation module
 * in this folder, which always pairs a metric against the *next* day's
 * weight change. See `CustomCorrelation`'s own doc comment for why this
 * is a genuinely different shape, not an oversight. */
export interface MetricValuePoint {
  date: string
  aValue: number
  bValue: number
}

/** Resolves one `MetricRef` side into a plain `date -> value` map, reading
 * from whichever source it actually points at — this app's own
 * `DailyEntry` fields for a built-in key, or a specific `CustomMetric`'s
 * own logged entries for a custom one. The caller intersects two of these
 * maps (see `pointsFromValueMaps`) to find the days both sides actually
 * have something to compare. */
export function resolveMetricValueMap(
  ref: MetricRef,
  entries: DailyEntry[],
  customMetricEntries: CustomMetricEntry[],
  dayStartTime = '00:00',
): Map<string, number> {
  if (ref.kind === 'builtin') {
    return numericSeriesValueByDate(entries, ref.key, dayStartTime)
  }
  const byDate = new Map<string, number>()
  for (const entry of customMetricEntries) {
    if (entry.metricId === ref.metricId) byDate.set(entry.date, entry.value)
  }
  return byDate
}

/** Intersects two `date -> value` maps into same-day pairs, sorted
 * ascending — a day only contributes a point if *both* sides have a
 * logged value for it. */
export function pointsFromValueMaps(
  aByDate: Map<string, number>,
  bByDate: Map<string, number>,
): MetricValuePoint[] {
  const points: MetricValuePoint[] = []
  for (const [date, aValue] of aByDate) {
    const bValue = bByDate.get(date)
    if (bValue === undefined) continue
    points.push({ date, aValue, bValue })
  }
  return points.sort((a, b) => a.date.localeCompare(b.date))
}

/** Convenience combining `resolveMetricValueMap` + `pointsFromValueMaps`
 * for a full `CustomCorrelation`'s two `MetricRef`s at once. */
export function customCorrelationPoints(
  metricA: MetricRef,
  metricB: MetricRef,
  entries: DailyEntry[],
  customMetricEntries: CustomMetricEntry[],
  dayStartTime = '00:00',
): MetricValuePoint[] {
  return pointsFromValueMaps(
    resolveMetricValueMap(metricA, entries, customMetricEntries, dayStartTime),
    resolveMetricValueMap(metricB, entries, customMetricEntries, dayStartTime),
  )
}

export interface CustomCorrelationResult {
  dayCount: number
  /** The A-value splitting the "lower" and "upper" groups. */
  thresholdAValue: number
  lowerGroupAvgB: number
  upperGroupAvgB: number
  upperAveragedMoreB: boolean
  strength: CorrelationStrength
}

/**
 * The median-split math on its own, taking already-computed points — same
 * "reusable on its own from already-built points" shape
 * `mealFrequencyCorrelationFromPoints` already established, generalized to
 * any two same-day series instead of one fixed metric vs. weight delta.
 * Requires `MIN_COMPARABLE_DAYS` points, same minimum every other
 * correlation module in this folder uses. Strength is scale-invariant
 * (`classifyRelativeCorrelationStrength`) since B could be any unit at
 * all, unlike the fixed-kg thresholds the weight-delta-based views use.
 */
export function customCorrelationFromPoints(
  points: MetricValuePoint[],
): CustomCorrelationResult | null {
  if (points.length < MIN_COMPARABLE_DAYS) return null

  const sorted = [...points].sort((a, b) => a.aValue - b.aValue)
  const mid = Math.ceil(sorted.length / 2)
  const lowerGroup = sorted.slice(0, mid)
  const upperGroup = sorted.slice(mid)
  if (upperGroup.length === 0) return null

  const lowerGroupAvgB = average(lowerGroup.map((p) => p.bValue))
  const upperGroupAvgB = average(upperGroup.map((p) => p.bValue))
  const thresholdAValue =
    (lowerGroup[lowerGroup.length - 1].aValue + upperGroup[0].aValue) / 2

  return {
    dayCount: points.length,
    thresholdAValue,
    lowerGroupAvgB,
    upperGroupAvgB,
    upperAveragedMoreB: upperGroupAvgB > lowerGroupAvgB,
    strength: classifyRelativeCorrelationStrength(
      upperGroupAvgB - lowerGroupAvgB,
      points.map((p) => p.bValue),
    ),
  }
}

/** Full pipeline for one `CustomCorrelation`: builds its same-day points
 * from raw data, then the median-split summary. Returns null when there
 * aren't enough comparable days yet. */
export function customCorrelationInsight(
  metricA: MetricRef,
  metricB: MetricRef,
  entries: DailyEntry[],
  customMetricEntries: CustomMetricEntry[],
  dayStartTime = '00:00',
): CustomCorrelationResult | null {
  return customCorrelationFromPoints(
    customCorrelationPoints(
      metricA,
      metricB,
      entries,
      customMetricEntries,
      dayStartTime,
    ),
  )
}
