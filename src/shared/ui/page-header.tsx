import type * as React from 'react'

import { cn } from '@/shared/lib/utils'

export interface PageHeaderProps {
  title: string
  /** #904 — optional control beside the title (e.g. Day has-entry check). */
  titleAccessory?: React.ReactNode
  description?: string
  action?: React.ReactNode
  /**
   * #888 — pin `action` to the top-right without stretching the title row.
   * Day's share control is `icon-xl` (48px); a flex sibling left a gap
   * under «День» before the date label.
   */
  overlayAction?: boolean
  className?: string
}

export function PageHeader({
  title,
  titleAccessory,
  description,
  action,
  overlayAction = false,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        overlayAction
          ? 'relative'
          : 'flex items-start justify-between gap-4',
        overlayAction && action ? 'pr-12' : null,
        className,
      )}
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
          {titleAccessory}
        </div>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action && (
        <div
          className={
            overlayAction ? 'absolute top-0 right-0' : 'shrink-0'
          }
        >
          {action}
        </div>
      )}
    </div>
  )
}
