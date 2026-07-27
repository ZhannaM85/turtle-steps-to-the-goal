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

/**
 * Scale-invariant strength banding for #336's generic any-two-metrics
 * engine — every other classifier above compares against a *fixed kg*
 * threshold, which only makes sense because their dependent axis is
 * always weight. A user-defined correlation's "B" side could be
 * anything (steps, grams of protein, a 1-5 severity scale), so there's
 * no single fixed number that reads as "a lot" across all of them.
 * Instead this bands the two groups' average-B difference against B's
 * own standard deviation across every point — a standard effect-size
 * convention (Cohen's d: ~0.2 "small", ~0.5 "medium", ~0.8 "large") that
 * self-scales to whatever unit B happens to be in. Reuses medium/large as
 * the moderate/strong cutoffs and folds "small" into "weak" — this app
 * only has three bands, not five.
 */
export function classifyRelativeCorrelationStrength(
  groupAvgDifference: number,
  allBValues: number[],
): CorrelationStrength {
  if (allBValues.length < 2) return 'weak'
  const mean = allBValues.reduce((sum, v) => sum + v, 0) / allBValues.length
  const variance =
    allBValues.reduce((sum, v) => sum + (v - mean) ** 2, 0) / allBValues.length
  const stdDev = Math.sqrt(variance)
  if (stdDev === 0) return 'weak'
  const effectSize = Math.abs(groupAvgDifference) / stdDev
  if (effectSize >= 0.8) return 'strong'
  if (effectSize >= 0.5) return 'moderate'
  return 'weak'
}
