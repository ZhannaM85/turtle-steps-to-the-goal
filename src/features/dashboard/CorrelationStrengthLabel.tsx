import type { CorrelationStrength } from '@/domain/stats'
import { useTranslation } from '@/i18n'

/**
 * #224 — shared across every correlation view (weekly calories one and the
 * four day-pair ones): a small plain-language label ("Weak/Moderate/Strong
 * pattern") for the gap between the two compared groups' average weight
 * change, computed by `classifyCorrelationStrength` (see
 * `domain/stats/correlationStrength.ts`).
 */
export function CorrelationStrengthLabel({
  strength,
}: {
  strength: CorrelationStrength
}) {
  const t = useTranslation()
  return (
    <p className="text-xs font-medium text-muted-foreground">
      {t.dashboard.correlationStrengthLabel(strength)}
    </p>
  )
}
