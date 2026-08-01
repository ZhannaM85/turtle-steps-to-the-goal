import { useTranslation } from '@/i18n'
import { cn } from '@/shared/lib/utils'

export interface ReachedGoalLegendProps {
  /** #490 — when pressed, List/Calendar focuses on met-target days. */
  filterMetDays: boolean
  /** #490 — when pressed, List/Calendar focuses on heading-toward days. */
  filterHeadingTowardDays: boolean
  onToggleMetDays: () => void
  onToggleHeadingTowardDays: () => void
}

/**
 * #479 / #490 — chip legend next to History List/Calendar.
 * Tap a chip to **show** those dates (filter), not to hide a tint.
 * Tints always paint; chips only change which dates are in focus.
 */
export function ReachedGoalLegend({
  filterMetDays,
  filterHeadingTowardDays,
  onToggleMetDays,
  onToggleHeadingTowardDays,
}: ReachedGoalLegendProps) {
  const t = useTranslation()
  const items = [
    {
      key: 'met',
      pressed: filterMetDays,
      onToggle: onToggleMetDays,
      swatchClass: 'bg-primary/15 ring-1 ring-primary/30',
      label: t.history.reachedGoalDayLabel,
    },
    {
      key: 'heading',
      pressed: filterHeadingTowardDays,
      onToggle: onToggleHeadingTowardDays,
      swatchClass: 'bg-primary/5 ring-1 ring-primary/20',
      label: t.history.reachedGoalWindowDayLabel,
    },
  ] as const

  return (
    <ul
      aria-label={t.history.reachedGoalLegendLabel}
      className="flex flex-row flex-wrap gap-2 text-sm"
    >
      {items.map((item) => (
        <li key={item.key}>
          <button
            type="button"
            aria-pressed={item.pressed}
            aria-label={`${item.label} — ${t.history.reachedGoalLegendLabel}`}
            onClick={item.onToggle}
            className={cn(
              'inline-flex items-center gap-2 rounded-full border px-2.5 py-1 outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50',
              item.pressed
                ? 'border-primary/40 bg-muted text-foreground'
                : 'border-border bg-card text-muted-foreground',
            )}
          >
            <span
              aria-hidden="true"
              className={cn('size-3 shrink-0 rounded-sm', item.swatchClass)}
            />
            {item.label}
          </button>
        </li>
      ))}
    </ul>
  )
}
