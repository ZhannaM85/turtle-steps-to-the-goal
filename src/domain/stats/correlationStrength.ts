export type CorrelationStrength = 'weak' | 'moderate' | 'strong'

/**
 * #224 — a deterministic, plain-arithmetic strength label for this app's
 * median-split correlation views (they compare two groups' average weight
 * change, not a real Pearson correlation coefficient — so this bands the
 * absolute gap between those two group averages against fixed kg
 * thresholds, rather than computing an r-value that wouldn't map onto this
 * model). Two threshold sets exist because the two kinds of delta this app
 * compares aren't the same scale: `correlationInsight` (calories) compares
 * *weekly* deltas, which are naturally larger in magnitude than the
 * *day-pair* deltas every other correlation module (sleep/steps/protein/
 * late-meal) compares — using one threshold set for both would either read
 * every weekly gap as "strong" or every daily gap as "weak."
 */
export const WEEKLY_STRENGTH_THRESHOLDS_KG = {
  moderateKg: 0.15,
  strongKg: 0.35,
}

export const DAILY_STRENGTH_THRESHOLDS_KG = {
  moderateKg: 0.05,
  strongKg: 0.15,
}

export function classifyCorrelationStrength(
  groupAvgDeltaDifferenceKg: number,
  thresholds: { moderateKg: number; strongKg: number },
): CorrelationStrength {
  const diff = Math.abs(groupAvgDeltaDifferenceKg)
  if (diff >= thresholds.strongKg) return 'strong'
  if (diff >= thresholds.moderateKg) return 'moderate'
  return 'weak'
}
