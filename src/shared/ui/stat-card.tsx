import type * as React from 'react'

import { cn } from '@/shared/lib/utils'
import { Card, CardContent } from '@/shared/ui/card'
import { SegmentedProgressBar } from '@/shared/ui/segmented-progress-bar'

export interface StatCardProps {
  label: string
  value: React.ReactNode
  unit?: string
  description?: string
  className?: string
  /** #232 — an eye-icon show/hide toggle (or other small action) next to
   * the label, for a dismissible Today/Goal section. Slotted into this
   * card's own existing label row rather than a separate title above it,
   * so the label isn't shown twice. */
  action?: React.ReactNode
  /** #320 — percent of a numeric daily goal consumed so far (0-100+, not
   * capped by the caller). Renders a `SegmentedProgressBar` under the
   * value/description when given — see that component for the segment
   * behavior itself. */
  progressPercent?: number
  progressColor?: string
  /** #430 — optional click handler to make the card interactive, e.g.
   * scrolling to a related control section */
  onClick?: () => void
  /** #565 — optional content below the value/description (e.g. weekly
   * note controls inside a Dashboard week card). */
  children?: React.ReactNode
}

export function StatCard({
  label,
  value,
  unit,
  description,
  className,
  action,
  progressPercent,
  progressColor = 'var(--primary)',
  onClick,
  children,
}: StatCardProps) {
  return (
    // #395 — `Card`'s own base styles include `overflow-hidden` (needed
    // elsewhere for clipping an image's square corners to match the card's
    // rounded ones), but per the CSS flexbox spec, `overflow` other than
    // `visible` makes a flex item's *automatic minimum size* resolve to 0
    // instead of its content size — inside a scrollable flex-column list
    // of many StatCards (`WeeklySummaryCards`/`MonthlySummaryCards`, #379),
    // that let a card's box shrink below its actual content height, with
    // `overflow-hidden` then silently clipping the value/description text
    // that no longer fit. Confirmed live: removing `overflow-hidden`
    // (verified interactively via DevTools on a real reported case) made
    // the clipped value reappear immediately, no other change needed.
    // StatCard never renders an image, so overriding back to
    // `overflow-visible` here is safe for every current/future usage.
    <Card
      onClick={onClick}
      className={cn('overflow-visible', onClick && 'cursor-pointer', className)}
    >
      <CardContent className="flex flex-col gap-1">
        <span className="flex items-center justify-between gap-2">
          <span className="text-sm text-muted-foreground">{label}</span>
          {action}
        </span>
        <span className="flex items-baseline gap-1.5">
          <span className="text-4xl font-semibold tabular-nums text-foreground">
            {value}
          </span>
          {unit && (
            <span className="text-lg text-muted-foreground">{unit}</span>
          )}
        </span>
        {description && (
          // #521 — allow a multi-line description (e.g. target − consumed
          // above remaining macros on the Day КБЖУ Remaining card). Plain
          // strings without newlines are unchanged.
          <span className="whitespace-pre-line text-sm text-muted-foreground">
            {description}
          </span>
        )}
        {progressPercent !== undefined && (
          <SegmentedProgressBar
            percent={progressPercent}
            color={progressColor}
            label={label}
            className="mt-1"
          />
        )}
        {children}
      </CardContent>
    </Card>
  )
}
