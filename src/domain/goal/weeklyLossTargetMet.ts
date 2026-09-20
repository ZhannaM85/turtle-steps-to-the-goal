/**
 * Round a kilogram value to one decimal (#971).
 *
 * IEEE-754 makes values like `59.8 - 59.7` come out as `0.0999…` instead of
 * `0.1`. Rounding restores the 0.1 kg step the scale / UI actually shows.
 */
export function roundKgToOneDecimal(kg: number): number {
  return Math.round(kg * 10) / 10
}

/**
 * Whether loss from `baselineKg` to `currentKg` meets `targetLossKg`.
 *
 * Rounds both weights and the resulting loss (and the target) to 1 decimal
 * kg so exact displayed equality (`59.8 → 59.7` on a `0.1` kg goal, the
 * 2026-09-14…20 export) counts as reached.
 */
export function weeklyLossTargetMet(
  baselineKg: number,
  currentKg: number,
  targetLossKg: number,
): boolean {
  const lossKg = roundKgToOneDecimal(
    roundKgToOneDecimal(baselineKg) - roundKgToOneDecimal(currentKg),
  )
  return lossKg >= roundKgToOneDecimal(targetLossKg)
}
