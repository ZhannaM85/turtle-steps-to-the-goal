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
   * capped by the caller). Renders a fixed row of `PROGRESS_SEGMENT_COUNT`
   * segments under the value/description, each representing one equal
   * fraction of the goal — a segment is solid `progressColor` once its own
   * fraction is fully reached, otherwise a light tint of the same color
   * (`color-mix` toward `--card`), so achieved-vs-remaining reads at a
   * glance. Replaced an earlier single continuous fill (with a solid-
   * foreground "at/over goal" state) after live feedback that it read as
   * boring and that the water bar's over-goal black was confusing. */
  progressPercent?: number
  progressColor?: string
}

const PROGRESS_SEGMENT_COUNT = 10

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
  const achievedSegments =
    progressPercent === undefined
      ? 0
      : Math.min(
          Math.floor(
            (Math.max(progressPercent, 0) / 100) * PROGRESS_SEGMENT_COUNT,
          ),
          PROGRESS_SEGMENT_COUNT,
        )

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
            className="mt-1 flex w-full gap-1"
          >
            {Array.from({ length: PROGRESS_SEGMENT_COUNT }, (_, i) => (
              <div
                key={i}
                className="h-1.5 flex-1 rounded-full transition-colors"
                style={{
                  backgroundColor:
                    i < achievedSegments
                      ? progressColor
                      : `color-mix(in oklch, ${progressColor}, var(--card) 70%)`,
                }}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
