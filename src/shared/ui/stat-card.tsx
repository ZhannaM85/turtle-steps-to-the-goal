import type * as React from 'react'

import { Card, CardContent } from '@/shared/ui/card'

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
   * capped by the caller). Renders a slim bar under the value/description
   * so progress reads at a glance instead of only from the number. The
   * fill uses `progressColor` up to 100%, then switches to a bolder solid
   * `--foreground` once at/over goal — deliberately not an alarm color
   * (red/destructive): this app's whole tone is no badges/streaks/guilt
   * (see e.g. the goal-renewal reminder's own "no-pressure" comment in
   * TodayScreen.tsx), and going over isn't uniformly bad across every
   * metric this is used for (over-protein is framed as a good thing). */
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
          <div
            role="progressbar"
            aria-label={label}
            aria-valuenow={Math.round(Math.min(Math.max(progressPercent, 0), 100))}
            aria-valuemin={0}
            aria-valuemax={100}
            className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full transition-[width]"
              style={{
                width: `${Math.min(Math.max(progressPercent, 0), 100)}%`,
                backgroundColor:
                  progressPercent >= 100 ? 'var(--foreground)' : progressColor,
              }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
