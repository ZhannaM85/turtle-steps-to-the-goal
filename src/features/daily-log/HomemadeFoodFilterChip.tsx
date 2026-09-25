import { useTranslation } from '@/i18n'
import { cn } from '@/shared/lib/utils'

/** #994 — meal-search chip. Pressed lists only homemade catalog dishes. */
export function HomemadeFoodFilterChip({
  pressed,
  onToggle,
}: {
  pressed: boolean
  onToggle: () => void
}) {
  const t = useTranslation()
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onToggle}
      className={cn(
        'inline-flex h-9 items-center self-start rounded-full border px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50',
        pressed
          ? 'border-primary/40 bg-muted text-foreground'
          : 'border-border bg-card text-muted-foreground',
      )}
    >
      {t.dailyEntry.homemadeDishLabel}
    </button>
  )
}
