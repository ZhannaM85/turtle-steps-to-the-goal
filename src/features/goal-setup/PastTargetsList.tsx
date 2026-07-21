import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Trash2 } from 'lucide-react'
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
import { Button } from '@/shared/ui/button'

export interface PastTargetsListProps {
  records: PastGoalRecord[]
  onDelete: (id: string) => void
}

function PastTargetRow({
  record: { goal, progress, approximateEndDate },
  onDelete,
}: {
  record: PastGoalRecord
  onDelete: (id: string) => void
}) {
  const t = useTranslation()
  const locale = useLocale()
  const dateFnsLocale = getDateFnsLocale(locale)
  const displayUnit = useUnitStore((state) => state.unit)
  const toDisplay = (kg: number) => (displayUnit === 'lb' ? kgToLb(kg) : kg)
  const unit = unitLabel(displayUnit, t)
  // Two-step confirm (#174) — same shape as history/EntryRow.tsx's own
  // per-row delete.
  const [isConfirming, setIsConfirming] = useState(false)

  // #177: name the day it was reached, not just a binary state —
  // metOnDate is always set whenever targetMet is true (see
  // goalWindowProgress.ts), targetMetLabel is a defensive fallback only.
  const statusLabel =
    progress?.targetMet === true
      ? progress.metOnDate
        ? t.goal.targetMetOnLabel(
            format(parseISO(progress.metOnDate), 'MMM d', {
              locale: dateFnsLocale,
            }),
          )
        : t.goal.targetMetLabel
      : progress?.targetMet === false
        ? t.goal.targetMissedLabel
        : t.goal.targetNoDataLabel

  // #181: a legacy goal (no weekStart, saved before #135) has no real
  // window — approximateEndDate (from goalHistory.ts) derives a
  // display-only range from when the next goal was created instead of
  // showing just a bare single date.
  const weekRangeLabel = goal.weekStart
    ? t.common.weekRangeLabel(
        format(parseISO(goal.weekStart), 'MMM d', { locale: dateFnsLocale }),
        format(parseISO(goalWeekEnd(goal.weekStart)), 'MMM d', {
          locale: dateFnsLocale,
        }),
      )
    : approximateEndDate
      ? t.common.weekRangeLabel(
          format(parseISO(goal.createdAt), 'MMM d', { locale: dateFnsLocale }),
          format(parseISO(approximateEndDate), 'MMM d', {
            locale: dateFnsLocale,
          }),
        )
      : format(parseISO(goal.createdAt), 'MMM d', { locale: dateFnsLocale })

  return (
    <tr className="border-b border-border last:border-b-0">
      <td className="py-2 pr-2 align-top">{weekRangeLabel}</td>
      <td className="py-2 pr-2 text-right align-top tabular-nums text-muted-foreground">
        {/* Negated (#178) — a loss, same convention GoalScreen.tsx's/
         * TodayScreen.tsx's own StatCards already use ("-0.6 kg to
         * lose"); this list showed the raw positive targetWeeklyLossKg
         * instead. */}
        {t.goal.targetPerWeek(
          formatNumber(-toDisplay(goal.targetWeeklyLossKg), locale),
          unit,
        )}
      </td>
      <td className="py-2 pr-2 align-top">
        <span
          className={cn(
            'text-xs',
            progress?.targetMet === true
              ? 'font-medium text-foreground'
              : 'text-muted-foreground',
          )}
        >
          {statusLabel}
        </span>
      </td>
      <td className="py-2 text-right align-top">
        {isConfirming ? (
          <div className="flex flex-wrap items-center justify-end gap-1.5 text-xs">
            <span className="text-muted-foreground">
              {t.goal.confirmDeletePastTargetLabel}
            </span>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => onDelete(goal.id)}
            >
              {t.goal.confirmDeletePastTargetYes}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsConfirming(false)}
            >
              {t.goal.confirmDeletePastTargetNo}
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t.goal.deletePastTargetLabel(weekRangeLabel)}
            onClick={() => setIsConfirming(true)}
          >
            <Trash2 aria-hidden="true" />
          </Button>
        )}
      </td>
    </tr>
  )
}

/**
 * A plain history of past weekly targets (#147) — when each was set and
 * whether it was reached, same "plain record, not a badge" visual language
 * `MetTargetList` already established for History's met-target list.
 * Renders nothing once there's no history yet (a single goal ever saved).
 */
export function PastTargetsList({ records, onDelete }: PastTargetsListProps) {
  const t = useTranslation()

  if (records.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-medium text-muted-foreground">
        {t.goal.pastTargetsTitle}
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th
                scope="col"
                className="py-2 pr-2 text-left font-normal text-muted-foreground"
              >
                {t.goal.weekColumnLabel}
              </th>
              <th
                scope="col"
                className="py-2 pr-2 text-right font-normal text-muted-foreground"
              >
                {t.goal.targetColumnLabel}
              </th>
              <th
                scope="col"
                className="py-2 pr-2 text-left font-normal text-muted-foreground"
              >
                {t.goal.statusColumnLabel}
              </th>
              <th scope="col" className="py-2 text-right font-normal">
                <span className="sr-only">{t.history.actionsColumn}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <PastTargetRow
                key={record.goal.id}
                record={record}
                onDelete={onDelete}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
