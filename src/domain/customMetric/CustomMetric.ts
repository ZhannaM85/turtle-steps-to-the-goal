/**
 * How a custom metric's value is entered (#336) — every kind stores a plain
 * `number` underneath (`CustomMetricEntry.value`), so every metric plugs
 * into the same numeric median-split correlation math regardless of which
 * widget was used to type it: `boolean` is just 1/0, `scale5` is just
 * 1-5. Resolved via `AskUserQuestion` before building — the alternative
 * (three fully separate value-type domain models) would have meant three
 * separate correlation code paths for no real benefit, since the
 * statistics only ever care about the number.
 */
export type CustomMetricInputKind = 'number' | 'boolean' | 'scale5'

/**
 * A user-defined thing to track and correlate against (#336) — e.g.
 * "training session" (boolean) or "acne" (1-5 scale), things this app has
 * no built-in field for. Purely a definition; a day's actual logged value
 * is a separate `CustomMetricEntry`, same "template vs. instance" split
 * `Recipe`/`recipePerServing` already uses.
 */
export interface CustomMetric {
  id: string
  name: string
  inputKind: CustomMetricInputKind
  /** Free-text unit shown next to a value, e.g. "reps", "hours" — `number`
   * kind only; `boolean`/`scale5` have their own fixed widget with no unit
   * to speak of. */
  unit?: string
  createdAt: string
}

/**
 * One day's logged value for one `CustomMetric` (#336) — `value` is always
 * a plain number regardless of `inputKind` (see `CustomMetricInputKind`
 * above): a `boolean` metric stores 1 or 0, a `scale5` metric stores 1-5,
 * a `number` metric stores whatever was typed. At most one entry per
 * `(metricId, date)` pair — logging again for an already-logged day
 * overwrites it (same "re-saving today's weight replaces, not
 * duplicates" convention every other daily field already follows), never
 * appends a second entry.
 */
export interface CustomMetricEntry {
  id: string
  metricId: string
  date: string
  value: number
  updatedAt: string
}
