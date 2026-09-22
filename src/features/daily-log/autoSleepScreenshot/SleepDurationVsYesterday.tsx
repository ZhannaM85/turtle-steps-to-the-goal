import { useTranslation } from '@/i18n'
import { formatSleepDuration } from '@/shared/lib/sleepDuration'
import { cn } from '@/shared/lib/utils'
import { sleepDurationVsYesterday } from './sleepDurationVsYesterday'

const toneClassName = {
  good: 'text-status-good',
  bad: 'text-status-warn',
} as const

/**
 * Same ↑/↓ “compared to yesterday” line as entry comparisons (#664) and
 * the Zepp confirm modal (#805). Yesterday-only: a missing metric renders
 * nothing instead of falling back to an older day or to zero (#976).
 */
export function SleepDurationVsYesterday({
  currentHours,
  yesterdayHours,
}: {
  currentHours: number | undefined
  yesterdayHours: number | undefined
}) {
  const t = useTranslation()
  const delta = sleepDurationVsYesterday(currentHours, yesterdayHours)
  if (delta === null) return null

  const amount = formatSleepDuration(
    delta.absHours,
    t.dailyEntry.hoursUnit,
    t.dailyEntry.minutesUnit,
  )
  const arrow = delta.direction === 'up' ? '↑' : '↓'

  return (
    <p
      className={cn('text-xs', toneClassName[delta.tone])}
      aria-live="polite"
    >
      {t.dailyEntry.entryComparisonComparedToYesterday(arrow, amount)}
    </p>
  )
}
