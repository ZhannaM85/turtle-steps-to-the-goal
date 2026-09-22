import {
  comparisonDirection,
  comparisonTone,
  type ComparisonTone,
} from '@/domain/dailyEntry'

export interface SleepDurationDelta {
  direction: 'up' | 'down'
  tone: ComparisonTone
  /** Absolute change in decimal hours, already a whole number of minutes. */
  absHours: number
}

/**
 * #976 — scanned sleep vs the previous calendar day's saved value.
 * Compared in whole minutes so a float leftover does not show as a change.
 * `undefined` yesterday means that metric was not logged — not zero.
 */
export function sleepDurationVsYesterday(
  currentHours: number | undefined,
  yesterdayHours: number | undefined,
): SleepDurationDelta | null {
  if (
    currentHours === undefined ||
    yesterdayHours === undefined ||
    !Number.isFinite(currentHours) ||
    !Number.isFinite(yesterdayHours)
  ) {
    return null
  }

  const currentMinutes = Math.round(currentHours * 60)
  const yesterdayMinutes = Math.round(yesterdayHours * 60)
  const direction = comparisonDirection(currentMinutes, yesterdayMinutes)
  const tone = comparisonTone(
    currentMinutes,
    yesterdayMinutes,
    'higherIsBetter',
  )
  if (direction === null || tone === null) return null

  return {
    direction,
    tone,
    absHours: Math.abs(currentMinutes - yesterdayMinutes) / 60,
  }
}
