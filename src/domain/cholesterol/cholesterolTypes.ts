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

/** Shape of `src/data/cholesterol-foods.json`. The file is the only copy. */
export interface CholesterolSeedFood {
  name: string
  cholesterolImpact: string
  cholesterolReason?: string
}

export interface CholesterolSeedFile {
  schemaVersion: number
  description: string
  impactLevels: Record<string, string>
  foods: CholesterolSeedFood[]
}

export function isCholesterolImpact(
  value: string,
): value is CholesterolImpact {
  return (CHOLESTEROL_IMPACTS as readonly string[]).includes(value)
}
