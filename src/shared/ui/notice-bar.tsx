import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/shared/lib/utils'

/**
 * #875 — one chrome family for inline confirms, undo toasts, and quiet
 * nudges. Confirm-delete matches `ConfirmDeleteEntryBar` (`bg-muted`).
 * Undo / nudge share the muted bordered strip. Copy and two-step flow
 * stay with the caller.
 */
export type NoticeBarVariant = 'confirm' | 'undo' | 'nudge'

const variantClass: Record<NoticeBarVariant, string> = {
  confirm: 'rounded-lg bg-muted',
  undo: 'rounded-lg border border-border bg-muted/40',
  nudge: 'rounded-lg border border-border bg-muted/40',
}

export function NoticeBar({
  variant,
  children,
  actions,
  role,
  className,
  style,
}: {
  variant: NoticeBarVariant
  children: ReactNode
  actions?: ReactNode
  role?: 'status'
  className?: string
  style?: CSSProperties
}) {
  return (
    <div
      role={role}
      data-variant={variant}
      style={style}
      className={cn(
        'flex min-h-12 items-center gap-2 px-3 py-2',
        variant !== 'confirm' && 'justify-between',
        variantClass[variant],
        className,
      )}
    >
      <div className="min-w-0 text-sm text-muted-foreground">{children}</div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
  )
}
