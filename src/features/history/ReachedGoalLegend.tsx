import { useTranslation } from '@/i18n'
import { cn } from '@/shared/lib/utils'

export interface ReachedGoalLegendProps {
  /** #479 — whether the strong (met-day) tint is shown. */
  showMetDay: boolean
  /** #479 — whether the light (heading-toward) tint is shown. */
  showHeadingToward: boolean
  onToggleMetDay: () => void
  onToggleHeadingToward: () => void
}

/**
 * #479 — toggleable tint legend for History List/Calendar. Rows stay
 * visible when off (dimmed) so they can be turned back on. Place next to
 * the table or calendar grid, not above the view-mode toggle.
 */
export function ReachedGoalLegend({
  showMetDay,
  showHeadingToward,
  onToggleMetDay,
  onToggleHeadingToward,
}: ReachedGoalLegendProps) {
  const t = useTranslation()
  const items = [
    {
      key: 'met',
      pressed: showMetDay,
      onToggle: onToggleMetDay,
      swatchClass: 'bg-primary/15 ring-1 ring-primary/30',
      label: t.history.reachedGoalDayLabel,
    },
    {
      key: 'heading',
      pressed: showHeadingToward,
      onToggle: onToggleHeadingToward,
      swatchClass: 'bg-primary/5 ring-1 ring-primary/20',
      label: t.history.reachedGoalWindowDayLabel,
    },
  ] as const

  return (
    <ul
      aria-label={t.history.reachedGoalLegendLabel}
      className="flex flex-row flex-wrap gap-x-3 gap-y-1.5 text-sm"
    >
      {items.map((item) => (
        <li key={item.key}>
          <button
            type="button"
            aria-pressed={item.pressed}
            aria-label={`${item.label} — ${t.history.reachedGoalLegendLabel}`}
            onClick={item.onToggle}
            className={cn(
              'flex items-center gap-2 rounded-md outline-none transition-opacity focus-visible:ring-3 focus-visible:ring-ring/50',
              item.pressed
                ? 'text-muted-foreground'
                : 'text-muted-foreground/50 line-through',
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                'size-3 shrink-0 rounded-sm',
                item.swatchClass,
                !item.pressed && 'opacity-40',
              )}
            />
            {item.label}
          </button>
        </li>
      ))}
    </ul>
  )
}
