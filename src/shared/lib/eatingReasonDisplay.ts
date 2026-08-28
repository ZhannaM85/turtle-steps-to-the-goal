import {
  isBuiltInEatingReason,
  type EatingReason,
} from '@/domain/dailyEntry'
import type { Dictionary } from '@/i18n'

/** #766 — user-edited labels for the six built-in eating reasons. */
export type EatingReasonLabelOverrides = Partial<Record<EatingReason, string>>

export function eatingReasonDisplayLabel(
  reason: string,
  t: Dictionary,
  overrides?: EatingReasonLabelOverrides,
): string {
  if (isBuiltInEatingReason(reason) && overrides?.[reason]) {
    return overrides[reason]
  }
  return t.dailyEntry.eatingReasonLabel(reason)
}
