import type { NumericSeriesKey } from '@/domain/stats'

/**
 * Which metric one side of a `CustomCorrelation` points at (#336) — either
 * one of this app's existing built-in numeric fields (the same
 * `NumericSeriesKey` set `CustomChartView`'s "Compare data" picker already
 * offers) or a user-defined `CustomMetric` by id. A discriminated union
 * rather than a single string id, so a built-in key never has to be
 * disambiguated from a custom metric's own uuid.
 */
export type MetricRef =
  | { kind: 'builtin'; key: NumericSeriesKey }
  | { kind: 'custom'; metricId: string }

/**
 * A user-defined correlation between any two metrics (#336) — built-in,
 * custom, or one of each, e.g. "acne" (custom) vs. "carbs" (built-in).
 * Unlike this app's five existing correlation views (all fixed as "metric
 * vs. the *next* day's weight change"), a custom correlation pairs both
 * sides on the *same* calendar day — genuinely different questions
 * ("does X predict tomorrow's weight" vs. "do X and Y tend to move
 * together"), resolved via `AskUserQuestion` before building rather than
 * silently forcing this into the existing next-day-weight-delta shape.
 * See `domain/stats/customCorrelationEngine.ts` for the actual pairing +
 * median-split math, reused as-is from the existing correlation views'
 * shared shape, just generalized to take any two same-day value series
 * instead of always ending in a weight delta.
 */
export interface CustomCorrelation {
  id: string
  /** Optional display name, e.g. "Acne vs. carbs" — falls back to
   * composing both sides' own labels when unset. */
  name?: string
  metricA: MetricRef
  metricB: MetricRef
  createdAt: string
}
