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

/**
 * Shape of `src/data/cholesterol-foods.json`. Migration seed for diary
 * names that are not on a catalog food (#1010). Catalog rows that set
 * `cholesterolImpact` are the source of truth for those foods. Matching
 * and the Day label use `name` and `cholesterolReason` only.
 */
export interface CholesterolSeedFood {
  name: string
  cholesterolImpact: string
  cholesterolReason?: string
  nameEn?: string
  cholesterolReasonEn?: string
  caloriesPer100g?: number
  state?: string
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
