import type { LucideIcon } from 'lucide-react'

export function AddMealQuickActionCard({
  Icon,
  label,
  ariaLabel,
  onClick,
}: {
  Icon: LucideIcon
  label: string
  /** Overrides the visible `label` as the accessible name. The barcode
   * tile includes the meal name (for example "Scan barcode — Breakfast"). */
  ariaLabel?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className="flex min-h-11 items-center gap-1.5 rounded-lg border border-border px-2 py-1.5 text-left text-xs font-medium leading-tight text-muted-foreground hover:bg-muted hover:text-foreground"
      onClick={onClick}
    >
      <Icon aria-hidden="true" className="size-4 shrink-0" />
      {label}
    </button>
  )
}
