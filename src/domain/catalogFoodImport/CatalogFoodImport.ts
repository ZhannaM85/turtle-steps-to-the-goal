import type { CholesterolImpact } from '@/domain/cholesterol'
import { normalizeTextSpaces } from '@/shared/lib/normalizeTextSpaces'

/** #1015 — one user-pasted catalog food. `nameRu` is the identity. */
export interface CatalogFoodDraft {
  nameRu: string
  nameEn?: string
  kcal100: number
  protein100: number
  fat100: number
  carbs100: number
  cholesterolImpact: CholesterolImpact
  cholesterolReason?: string
  cholesterolReasonEn?: string
  /**
   * Extra whole-name labels from a paste (`aliases`). Not stored.
   * Used so a diary row logged under another spelling still picks up LDL.
   */
  aliases?: string[]
}

export interface CatalogFoodImport extends CatalogFoodDraft {
  updatedAt: string
}

/** Trim and collapse spaces. Case stays, so the match is still the whole name. */
export function collapseCatalogName(name: string): string {
  return normalizeTextSpaces(name).trim().replace(/\s+/g, ' ')
}
