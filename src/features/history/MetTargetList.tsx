import { format, parseISO } from 'date-fns'
import type { DailyEntry } from '@/domain/dailyEntry'
import { kgToLb, type Goal } from '@/domain/goal'
import { weeklySummaries } from '@/domain/stats'
import {
  formatSignedNumber,
  getDateFnsLocale,
  unitLabel,
  useLocale,
  useTranslation,
} from '@/i18n'
import { useUnitStore } from '@/stores'

export interface MetTargetListProps {
  entries: DailyEntry[]
  goal: Goal | null
}

/**
 * A plain record of weeks the target was hit — deliberately not a badge or
 * achievement collection (see the rewards/celebration discussion on #8):
 * just the week range and that week's delta, same visual language as the
 * rest of History. Renders nothing when no week qualifies (no goal set, or
 * none met yet) rather than showing an empty/zero state.
 */
export function MetTargetList({ entries, goal }: MetTargetListProps) {
  const t = useTranslation()
  const locale = useLocale()
  const dateFnsLocale = getDateFnsLocale(locale)
  const displayUnit = useUnitStore((state) => state.unit)
  const toDisplay = (kg: number) => (displayUnit === 'lb' ? kgToLb(kg) : kg)
  const unit = unitLabel(displayUnit, t)

  const metWeeks = weeklySummaries(entries, goal ?? undefined)
    .filter((week) => week.targetMet)
    .reverse()

  if (metWeeks.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-medium text-muted-foreground">
        {t.history.metTargetTitle}
      </h2>
      <ul className="flex flex-col gap-1.5">
        {metWeeks.map((week) => (
          <li
            key={week.weekStart}
            className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
          >
            <span>
              {t.dashboard.weekRange(
                format(parseISO(week.weekStart), 'MMM d', {
                  locale: dateFnsLocale,
                }),
                format(parseISO(week.weekEnd), 'MMM d', {
                  locale: dateFnsLocale,
                }),
              )}
            </span>
            <span className="tabular-nums text-muted-foreground">
              {formatSignedNumber(toDisplay(week.deltaVsPriorWeekKg!), locale)}{' '}
              {unit}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
