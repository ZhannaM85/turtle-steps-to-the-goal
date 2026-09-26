/** #1008 — qualitative LDL pattern for one food. Not a score. */
export const CHOLESTEROL_IMPACTS = [
  'beneficial',
  'neutral',
  'moderate',
  'limit',
  'high',
  'unknown',
] as const

export type CholesterolImpact = (typeof CHOLESTEROL_IMPACTS)[number]

export interface CholesterolClassification {
  cholesterolImpact: CholesterolImpact
  cholesterolReason?: string
}

export function isCholesterolImpact(
  value: string,
): value is CholesterolImpact {
  return (CHOLESTEROL_IMPACTS as readonly string[]).includes(value)
}
