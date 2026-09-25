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
      className="flex flex-col items-center gap-1.5 rounded-xl border border-border p-3 text-center text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
      onClick={onClick}
    >
      <Icon aria-hidden="true" className="size-5" />
      {label}
    </button>
  )
}
