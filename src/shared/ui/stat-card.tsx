import type * as React from 'react'

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
}: StatCardProps) {
  return (
    <Card className={className}>
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
          <span className="text-sm text-muted-foreground">{description}</span>
        )}
        {progressPercent !== undefined && (
          <SegmentedProgressBar
            percent={progressPercent}
            color={progressColor}
            label={label}
            className="mt-1"
          />
        )}
      </CardContent>
    </Card>
  )
}
