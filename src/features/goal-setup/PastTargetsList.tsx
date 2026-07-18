import { format, parseISO } from 'date-fns'
import { cn } from '@/shared/lib/utils'
import type { PastGoalRecord } from '@/domain/goal'
import { goalWeekEnd, kgToLb } from '@/domain/goal'
import {
  formatNumber,
  getDateFnsLocale,
  unitLabel,
  useLocale,
  useTranslation,
} from '@/i18n'
import { useUnitStore } from '@/stores'

export interface PastTargetsListProps {
  records: PastGoalRecord[]
}

/**
 * A plain history of past weekly targets (#147) — when each was set and
 * whether it was reached, same "plain record, not a badge" visual language
 * `MetTargetList` already established for History's met-target list.
 * Renders nothing once there's no history yet (a single goal ever saved).
 */
export function PastTargetsList({ records }: PastTargetsListProps) {
  const t = useTranslation()
  const locale = useLocale()
  const dateFnsLocale = getDateFnsLocale(locale)
  const displayUnit = useUnitStore((state) => state.unit)
  const toDisplay = (kg: number) => (displayUnit === 'lb' ? kgToLb(kg) : kg)
  const unit = unitLabel(displayUnit, t)

  if (records.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-medium text-muted-foreground">
        {t.goal.pastTargetsTitle}
      </h2>
      <ul className="flex flex-col gap-1.5">
        {records.map(({ goal, progress }) => {
          const statusLabel =
            progress?.targetMet === true
              ? t.goal.targetMetLabel
              : progress?.targetMet === false
                ? t.goal.targetMissedLabel
                : t.goal.targetNoDataLabel
          return (
            <li
              key={goal.id}
              className="flex flex-col gap-0.5 rounded-lg border border-border px-3 py-2 text-sm"
            >
              <div className="flex items-center justify-between">
                <span>
                  {goal.weekStart
                    ? t.common.weekRangeLabel(
                        format(parseISO(goal.weekStart), 'MMM d', {
                          locale: dateFnsLocale,
                        }),
                        format(parseISO(goalWeekEnd(goal.weekStart)), 'MMM d', {
                          locale: dateFnsLocale,
                        }),
                      )
                    : format(parseISO(goal.createdAt), 'MMM d', {
                        locale: dateFnsLocale,
                      })}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {t.goal.targetPerWeek(
                    formatNumber(toDisplay(goal.targetWeeklyLossKg), locale),
                    unit,
                  )}
                </span>
              </div>
              <span
                className={cn(
                  'text-xs',
                  progress?.targetMet === true
                    ? 'font-medium'
                    : 'text-muted-foreground',
                )}
              >
                {statusLabel}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
