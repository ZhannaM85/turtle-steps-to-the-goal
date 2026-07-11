/**
 * Parses a numeric input's raw value into a number for React Hook Form's
 * `setValueAs`, accepting both '.' and ',' as the decimal separator — some
 * mobile keyboards and locales (e.g. Russian) only offer a comma, and
 * `type="number"` inputs silently reject it instead of normalizing it.
 * Empty/missing input becomes `undefined` rather than `NaN`, so Zod's
 * "optional" semantics and custom superRefine messages take over instead of
 * a generic NaN type error. `setValueAs` is called with the raw defaultValue
 * (already a number, from prefilled forms) as well as DOM input strings, so
 * this accepts either.
 */
export function parseNumberInput(value: unknown): number | undefined {
  if (value === '' || value === undefined || value === null) return undefined
  if (typeof value === 'number') return value
  return Number(String(value).replace(',', '.'))
}
