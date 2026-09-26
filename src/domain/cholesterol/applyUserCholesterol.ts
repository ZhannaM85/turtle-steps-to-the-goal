import type {
  CholesterolClassification,
  CholesterolImpact,
} from './cholesterolTypes'

type CholesterolCarrier = {
  cholesterolImpact?: CholesterolImpact
  cholesterolReason?: string
}

/** Form value: empty reason is omitted, not stored as a blank string. */
export function cholesterolChoice(
  impact: CholesterolImpact,
  reason: string,
): CholesterolClassification {
  const trimmed = reason.trim()
  if (!trimmed) return { cholesterolImpact: impact }
  return { cholesterolImpact: impact, cholesterolReason: trimmed }
}

/**
 * #1013 — the add/edit form's LDL choice is written onto the food after
 * name classification, so a new dish can be `unknown` or a level the
 * catalog does not list. Calories and macros are not touched.
 */
export function applyUserCholesterol<T extends CholesterolCarrier>(
  record: T,
  choice: CholesterolClassification,
): T {
  const reason = choice.cholesterolReason?.trim()
  const next: T = { ...record, cholesterolImpact: choice.cholesterolImpact }
  if (reason) next.cholesterolReason = reason
  else delete next.cholesterolReason
  return next
}
