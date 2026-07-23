import type * as React from 'react'

import { Card, CardContent } from '@/shared/ui/card'
import { SegmentedProgressBar } from '@/shared/ui/segmented-progress-bar'

export interface CaloriesBreakdownCardProps {
  label: string
  totalValue: string
  totalLabel: string
  consumedValue: string
  consumedLabel: string
  remainingValue: string
  remainingLabel: string
  /** Read aloud as one sentence for screen readers — the visual layout
   * below (numbers + decorative −/= glyphs) doesn't reliably read as a
   * coherent equation on its own. */
  equationSummary: string
  progressPercent?: number
  progressColor?: string
  action?: React.ReactNode
}

/**
 * #326 — replaces a plain "300 kcal remaining / of 1,500 kcal" StatCard
 * with all three numbers visible at once (total, consumed, remaining),
 * after live feedback that seeing only "remaining" still left the user
 * hunting for the other two elsewhere on the page. Deliberately its own
 * component rather than a new StatCard variant — this three-number
 * equation layout has exactly one consumer so far (Today's calories
 * card), unlike StatCard's single-big-number shape used everywhere else.
 * Reuses `SegmentedProgressBar` directly (same component `StatCard` now
 * also uses) so the bar itself stays pixel-identical to every other
 * remaining-nutrient card.
 */
export function CaloriesBreakdownCard({
  label,
  totalValue,
  totalLabel,
  consumedValue,
  consumedLabel,
  remainingValue,
  remainingLabel,
  equationSummary,
  progressPercent,
  progressColor = 'var(--primary)',
  action,
}: CaloriesBreakdownCardProps) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2">
        <span className="flex items-center justify-between gap-2">
          <span className="text-sm text-muted-foreground">{label}</span>
          {action}
        </span>
        <span className="sr-only">{equationSummary}</span>
        <div
          aria-hidden="true"
          className="flex flex-wrap items-baseline gap-x-2 gap-y-1"
        >
          <span className="flex items-baseline gap-1">
            <span className="text-2xl font-semibold tabular-nums text-foreground">
              {totalValue}
            </span>
            <span className="text-xs text-muted-foreground">{totalLabel}</span>
          </span>
          <span className="text-muted-foreground">−</span>
          <span className="flex items-baseline gap-1">
            <span className="text-2xl font-semibold tabular-nums text-foreground">
              {consumedValue}
            </span>
            <span className="text-xs text-muted-foreground">
              {consumedLabel}
            </span>
          </span>
          <span className="text-muted-foreground">=</span>
          <span className="flex items-baseline gap-1.5">
            <span className="text-4xl font-semibold tabular-nums text-foreground">
              {remainingValue}
            </span>
            <span className="text-lg text-muted-foreground">
              {remainingLabel}
            </span>
          </span>
        </div>
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
