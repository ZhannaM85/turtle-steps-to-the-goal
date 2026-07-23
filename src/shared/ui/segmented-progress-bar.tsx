import { cn } from '@/shared/lib/utils'

export interface SegmentedProgressBarProps {
  /** Percent of a numeric daily goal consumed so far (0-100+, not capped
   * by the caller). */
  percent: number
  color: string
  /** Reused as the bar's own aria-label. */
  label: string
  className?: string
}

const PROGRESS_SEGMENT_COUNT = 10

/**
 * #320 — a fixed row of `PROGRESS_SEGMENT_COUNT` segments, each
 * representing one equal fraction of the goal: solid `color` once its own
 * fraction is fully reached (`Math.floor`, so a segment only lights up
 * once truly earned, not merely half-crossed), otherwise a light tint of
 * the same color (`color-mix` toward `--card`). At/over goal simply fills
 * every segment — no special "over" color, a fully-lit bar already reads
 * as done regardless of whether the metric being over is good or neutral.
 *
 * Extracted out of `StatCard` (#326) once `CaloriesBreakdownCard` needed
 * the identical bar — shared here instead of duplicating the segment math
 * in both places.
 */
export function SegmentedProgressBar({
  percent,
  color,
  label,
  className,
}: SegmentedProgressBarProps) {
  const achievedSegments = Math.min(
    Math.floor((Math.max(percent, 0) / 100) * PROGRESS_SEGMENT_COUNT),
    PROGRESS_SEGMENT_COUNT,
  )

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(Math.min(Math.max(percent, 0), 100))}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('flex w-full gap-1', className)}
    >
      {Array.from({ length: PROGRESS_SEGMENT_COUNT }, (_, i) => (
        <div
          key={i}
          className="h-1.5 flex-1 rounded-full transition-colors"
          style={{
            backgroundColor:
              i < achievedSegments
                ? color
                : `color-mix(in oklch, ${color}, var(--card) 70%)`,
          }}
        />
      ))}
    </div>
  )
}
