import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Trash2 } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import type { PastGoalRecord } from '@/domain/goal'
import { goalWeekEnd, kgToLb } from '@/domain/goal'
import {
  formatExactNumber,
  getDateFnsLocale,
  unitLabel,
  useLocale,
  useTranslation,
} from '@/i18n'
import { useSectionVisibilityStore, useUnitStore } from '@/stores'
import { Button } from '@/shared/ui/button'
import { SectionTitleWithToggle } from '@/shared/ui/section-title-with-toggle'

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

  // #177: name the day it was reached, not just a binary state.
  // #681: permanent Past Targets badge uses sticky `targetMet`/`metOnDate`
  // (once reached in the window, stays reached) — not `finalTargetMet`,
  // which #639 briefly used and which treated a mid-week reach that later
  // regressed as a miss (e.g. Aug 8 hit 58.4 from 58.75, then Aug 9 at
  // 58.65 read as "not met").
  const statusLabel =
    progress?.targetMet === true
      ? progress.metOnDate
        ? t.goal.targetMetOnLabel(
            format(parseISO(progress.metOnDate), 'PP', {
              locale: dateFnsLocale,
            }),
          )
        : t.goal.targetMetLabel
      : progress?.targetMet === false
        ? t.goal.targetMissedLabel
        : t.goal.targetNoDataLabel

  const statusToWeightKg =
    progress?.targetMet === true && progress.metOnWeightKg !== undefined
      ? progress.metOnWeightKg
      : progress?.currentWeightKg

  // #181: a legacy goal (no weekStart, saved before #135) has no real
  // window — approximateEndDate (from goalHistory.ts) derives a
  // display-only range from when the next goal was created instead of
  // showing just a bare single date.
  const weekRangeLabel = goal.weekStart
    ? t.common.weekRangeLabel(
        format(parseISO(goal.weekStart), 'PP', { locale: dateFnsLocale }),
        format(parseISO(goal.weekEnd ?? goalWeekEnd(goal.weekStart)), 'PP', {
          locale: dateFnsLocale,
        }),
      )
    : approximateEndDate
      ? t.common.weekRangeLabel(
          format(parseISO(goal.createdAt), 'PP', { locale: dateFnsLocale }),
          format(parseISO(approximateEndDate), 'PP', {
            locale: dateFnsLocale,
          }),
        )
      : format(parseISO(goal.createdAt), 'PP', { locale: dateFnsLocale })

  return (
    <tr className="border-b border-border last:border-b-0">
      <td className="py-2 pr-2 align-top">{weekRangeLabel}</td>
      <td className="py-2 pr-2 text-right align-top tabular-nums text-muted-foreground">
        {/* #527 — show positive magnitude (how much to lose). The leading
         * minus from #56/#178 made "−1 кг похудения" read as a gain. */}
        {t.goal.targetPerWeek(
          formatExactNumber(toDisplay(goal.targetWeeklyLossKg), locale),
          unit,
        )}
      </td>
      <td className="py-2 pr-2 align-top">
        <div className="flex flex-col gap-0.5">
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
          {/* #339 — which two weigh-ins the status above is based on;
           * both undefined only when weekStart itself never got a logged
           * weight, i.e. progress.targetMet is still null.
           * #681 — when reached, prefer the weight on metOnDate over the
           * window's latest weigh-in so a later regression doesn't rewrite
           * the "to" number next to a sticky reached status. */}
          {progress?.baselineWeightKg !== undefined &&
            statusToWeightKg !== undefined && (
              <span className="text-xs tabular-nums text-muted-foreground">
                {t.goal.previousToCurrentWeightLabel(
                  formatExactNumber(
                    toDisplay(progress.baselineWeightKg),
                    locale,
                  ),
                  formatExactNumber(toDisplay(statusToWeightKg), locale),
                  unit,
                )}
              </span>
            )}
        </div>
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
 * Renders nothing when `records` is empty (no concluded/superseded goals
 * yet — a still-live sole active goal is excluded by `pastGoals()` until
 * its window concludes, #678).
 */
export function PastTargetsList({ records, onDelete }: PastTargetsListProps) {
  const t = useTranslation()
  const cardVisible = useSectionVisibilityStore(
    (state) => state.visible.goalPastTargets,
  )
  const toggleVisible = useSectionVisibilityStore(
    (state) => state.toggleVisible,
  )

  if (records.length === 0) return null

  const cardTitle = (
    <SectionTitleWithToggle
      title={t.goal.pastTargetsTitle}
      visible={cardVisible}
      onToggle={() => toggleVisible('goalPastTargets')}
      hideLabel={t.common.hideSectionLabel(t.goal.pastTargetsTitle)}
      showLabel={t.common.showSectionLabel(t.goal.pastTargetsTitle)}
    />
  )

  if (!cardVisible) {
    return <div className="flex flex-col gap-2">{cardTitle}</div>
  }

  return (
    <div className="flex flex-col gap-2">
      {cardTitle}
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
