import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'

/**
 * #874 — one compact token for pick / show / remove.
 * Selected vs unselected (meal names, History legend). Optional remove
 * (water). Leave ToggleGroup for exclusive 2–3 option rows.
 */
export function Chip({
  selected = false,
  onSelect,
  onRemove,
  removeLabel,
  selectLabel,
  leading,
  children,
  className,
}: {
  selected?: boolean
  onSelect?: () => void
  onRemove?: () => void
  removeLabel?: string
  selectLabel?: string
  leading?: ReactNode
  children: ReactNode
  className?: string
}) {
  const shell = cn(
    'inline-flex min-w-0 items-center gap-1 rounded-full border text-sm outline-none transition-colors',
    onRemove ? 'py-1 pr-1 pl-2.5' : 'px-2.5 py-1',
    selected
      ? 'border-primary/40 bg-muted text-foreground'
      : 'border-border bg-card text-muted-foreground',
    className,
  )

  const label = (
    <>
      {leading}
      <span className="truncate">{children}</span>
    </>
  )

  if (onSelect && !onRemove) {
    return (
      <button
        type="button"
        aria-pressed={selected}
        aria-label={selectLabel}
        onClick={onSelect}
        className={cn(shell, 'focus-visible:ring-3 focus-visible:ring-ring/50')}
      >
        {label}
      </button>
    )
  }

  return (
    <span className={shell} data-selected={selected || undefined}>
      {onSelect ? (
        <button
          type="button"
          aria-label={selectLabel}
          onClick={onSelect}
          className="flex min-w-0 flex-1 items-center justify-center gap-1"
        >
          {label}
        </button>
      ) : (
        <span className="flex min-w-0 items-center gap-1">{label}</span>
      )}
      {onRemove ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-touch"
          aria-label={removeLabel}
          onClick={onRemove}
        >
          <X aria-hidden="true" />
        </Button>
      ) : null}
    </span>
  )
}
