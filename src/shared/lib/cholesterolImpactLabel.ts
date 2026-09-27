import type { CholesterolImpact } from '@/domain/cholesterol'
import type { Dictionary } from '@/i18n'

/** Day LDL chip text: helps / neutral / … / unknown (#1008, #1026). */
export function cholesterolImpactLabel(
  impact: CholesterolImpact,
  t: Dictionary,
): string {
  switch (impact) {
    case 'beneficial':
      return t.dailyEntry.cholesterolImpactBeneficial
    case 'neutral':
      return t.dailyEntry.cholesterolImpactNeutral
    case 'moderate':
      return t.dailyEntry.cholesterolImpactModerate
    case 'limit':
      return t.dailyEntry.cholesterolImpactLimit
    case 'high':
      return t.dailyEntry.cholesterolImpactHigh
    case 'unknown':
      return t.dailyEntry.cholesterolImpactUnknown
  }
}
