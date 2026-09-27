import type { CholesterolImpact } from '@/domain/cholesterol'
import { normalizeTextSpaces } from '@/shared/lib/normalizeTextSpaces'

/**
 * #1015 — one user-pasted catalog food.
 * #1027 — `barcode` is the identity when present; otherwise `nameRu`.
 */
export interface CatalogFoodDraft {
  nameRu: string
  nameEn?: string
  /** Package code. Spaces are not stored. */
  barcode?: string
  /** Manufacturer, kept on the catalog row. */
  brand?: string
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

/** Package code with spaces removed. Empty becomes omitted. */
export function normalizeCatalogBarcode(
  value: string | undefined,
): string | undefined {
  if (!value) return undefined
  const next = value.replace(/\s+/g, '').trim()
  return next || undefined
}

export interface CatalogFoodImport extends CatalogFoodDraft {
  updatedAt: string
}

/** Trim and collapse spaces. Case stays, so the match is still the whole name. */
export function collapseCatalogName(name: string): string {
  return normalizeTextSpaces(name).trim().replace(/\s+/g, ' ')
}
