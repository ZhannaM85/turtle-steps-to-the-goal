import { useTranslation } from '@/i18n'
import { useElapsedSince } from '@/shared/hooks/useElapsedSince'

/**
 * #791 — isolated so a 1s tick does not re-render the whole meal list.
 */
export function SinceLastMealTimer({ from }: { from: Date }) {
  const t = useTranslation()
  const parts = useElapsedSince(from, true)
  if (!parts) return null
  return (
    <p
      className="text-center text-sm text-muted-foreground"
      role="status"
    >
      <span className="block">{t.dailyEntry.sinceLastMealLabel}</span>
      <span className="text-base tabular-nums text-foreground">
        {t.dailyEntry.sinceLastMealDuration(
          parts.hours,
          parts.minutes,
          parts.seconds,
        )}
      </span>
    </p>
  )
}
