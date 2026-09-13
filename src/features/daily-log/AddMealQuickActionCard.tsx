import type { LucideIcon } from 'lucide-react'

export function AddMealQuickActionCard({
  Icon,
  label,
  ariaLabel,
  onClick,
}: {
  Icon: LucideIcon
  label: string
  /** Overrides the visible `label` as the accessible name — needed for the
   * barcode card, whose visible text ("Scan barcode") would otherwise
   * collide with the search bar's own same-labeled icon button (#459
   * deliberately keeps both, reversing #454's one-entry-point decision). */
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
