import { format, parseISO } from 'date-fns'
import type { DailyEntry } from '@/domain/dailyEntry'
import { kgToLb, type Goal } from '@/domain/goal'
import { weeklySummaries } from '@/domain/stats'
import {
  formatNumber,
  formatSignedNumber,
  getDateFnsLocale,
  unitLabel,
  useLocale,
  useTranslation,
} from '@/i18n'
import { useUnitStore } from '@/stores'
import { useWeekStartsOn } from '@/shared/hooks'

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
  const weekStartsOn = useWeekStartsOn(entries)

  const metWeeks = weeklySummaries(entries, goal ?? undefined, weekStartsOn)
    .filter((week) => week.targetMet)
    .reverse()

  if (metWeeks.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-medium text-muted-foreground">
        {t.history.metTargetTitle}
      </h2>
      {/* #425 — reported live: an unbounded list grew to dominate the page
       * once enough weeks qualified. Same max-h-96 overflow-y-auto scroll
       * region WeeklySummaryCards/MonthlySummaryCards/the outlier chip
       * lists already use elsewhere, rather than pagination — smaller
       * change, no new interactive state needed. */}
      <ul className="flex max-h-96 flex-col gap-1.5 overflow-y-auto">
        {metWeeks.map((week) => (
          <li
            key={week.weekStart}
            className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
          >
            <span>
              {t.dashboard.weekRange(
                format(parseISO(week.weekStart), 'PP', {
                  locale: dateFnsLocale,
                }),
                format(parseISO(week.weekEnd), 'PP', {
                  locale: dateFnsLocale,
                }),
              )}
            </span>
            <div className="flex flex-col items-end gap-0.5">
              <span className="tabular-nums text-muted-foreground">
                {formatSignedNumber(toDisplay(week.deltaVsPriorWeekKg!), locale)}{' '}
                {unit}
              </span>
              {/* #408 — the resulting weight itself, same "previous → current"
               * pair PastTargetsList (Goal page) already shows; both averages
               * are guaranteed non-null here since deltaVsPriorWeekKg is only
               * ever set once both weeks' averageWeightKg exist. */}
              <span className="text-xs tabular-nums text-muted-foreground">
                {t.goal.previousToCurrentWeightLabel(
                  formatNumber(
                    toDisplay(
                      week.averageWeightKg! - week.deltaVsPriorWeekKg!,
                    ),
                    locale,
                  ),
                  formatNumber(toDisplay(week.averageWeightKg!), locale),
                  unit,
                )}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
