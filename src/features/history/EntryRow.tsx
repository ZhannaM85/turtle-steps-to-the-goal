import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react'
import {
  totalCalories,
  totalCarbs,
  totalFat,
  totalProtein,
  type DailyEntry,
} from '@/domain/dailyEntry'
import { kgToLb } from '@/domain/goal'
import { formatExactNumber, formatNumber, useLocale, useTranslation } from '@/i18n'
import { DailyEntryForm } from '@/features/daily-log'
import { macrosSummaryTextCompact } from '@/shared/lib/macroDisplay'
import { cn } from '@/shared/lib/utils'
import { useUnitStore } from '@/stores'
import { Button } from '@/shared/ui/button'
import { DayDetail } from './DayDetail'

const COLUMN_COUNT = 5

export interface EntryRowProps {
  entry: DailyEntry
  onSaved: (entry: DailyEntry) => void
  onDeleted: (id: string) => void
  /** Opens the read-only detail panel immediately on mount — used when
   * arriving via a dashboard-chart deep link (#41) straight to this day. */
  defaultExpanded?: boolean
  /** #155: this day falls within [weekStart, metOnDate] of some reached
   * goal window (past or active) — tints the date cell. */
  isPartOfReachedGoalWindow?: boolean
  /** #155: this is the exact day some goal's target was first met —
   * marked more strongly than isPartOfReachedGoalWindow alone. */
  isGoalReachedDay?: boolean
}

type RowMode = 'view' | 'edit' | 'confirmDelete'

export function EntryRow({
  entry,
  onSaved,
  onDeleted,
  defaultExpanded = false,
  isPartOfReachedGoalWindow = false,
  isGoalReachedDay = false,
}: EntryRowProps) {
  const t = useTranslation()
  const locale = useLocale()
  const [mode, setMode] = useState<RowMode>('view')
  // Independent of `mode`: whether the read-only detail panel is open.
  // Kept separate so it survives a confirmDelete round-trip (cancel
  // returns to whatever expand state the row was already in) and is
  // untouched by switching to edit mode.
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const displayUnit = useUnitStore((state) => state.unit)
  // Unit lives in the column header instead of every row (#246) — the
  // per-row suffix was one of several things (alongside the date format in
  // #136 and the macros compact form above) crowding the Actions column's
  // icons off screen on narrow phones.
  const weightDisplay =
    entry.weightKg === undefined
      ? '—'
      : formatExactNumber(
          displayUnit === 'lb' ? kgToLb(entry.weightKg) : entry.weightKg,
          locale,
        )
  const calories = totalCalories(entry.calorieEntries)
  const caloriesDisplay =
    calories === undefined ? '—' : formatNumber(calories, locale, 0)
  const macrosSummary = macrosSummaryTextCompact(
    totalProtein(entry.calorieEntries),
    totalFat(entry.calorieEntries),
    totalCarbs(entry.calorieEntries),
    locale,
    t,
  )

  if (mode === 'edit') {
    return (
      <tr>
        {/* `block` escapes the table's auto-layout column sizing (#136) —
         * DailyEntryForm is built as a normal full-width page section, and
         * a `table-layout: auto` <td> sizes to its content's intrinsic
         * width regardless of `max-w-full`/`min-w-0`, so on mobile the
         * whole table (already wrapped in `overflow-x-auto` above) grew
         * wider than the viewport and cut content off until scrolled. As a
         * plain block box instead of a table-cell, it just takes the row's
         * available width like it does on the Today screen. */}
        <td
          colSpan={COLUMN_COUNT}
          className="block border-b border-border px-3 py-4"
        >
          <DailyEntryForm
            date={entry.date}
            existingEntry={entry}
            alwaysEditable
            onSave={onSaved}
          />
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => setMode('view')}
          >
            {t.history.doneEditingButton}
          </Button>
        </td>
      </tr>
    )
  }

  return (
    <>
      <tr>
        <td
          className={cn(
            'border-b border-border px-1.5 py-2 text-sm whitespace-nowrap sm:px-3',
            // #155: tints the date cell for a day that was part of a
            // reached goal window; the exact reach day gets a stronger
            // tint + bold weight so it reads as distinct within the range.
            isGoalReachedDay
              ? 'bg-primary/15 font-semibold text-primary'
              : isPartOfReachedGoalWindow && 'bg-primary/5',
          )}
        >
          {/* Compact numeric format (#73) — the localized 'PP' format
           * ("15 июл. 2026 г.") was wide enough, combined with the other
           * columns, to push the Actions column's icons off screen on
           * narrow phones. dd.MM.yy is locale-agnostic and unambiguous. */}
          {format(parseISO(entry.date), 'dd.MM.yy')}
          {(isGoalReachedDay || isPartOfReachedGoalWindow) && (
            <span className="sr-only">
              {' '}
              {isGoalReachedDay
                ? t.history.reachedGoalDayLabel
                : t.history.reachedGoalWindowDayLabel}
            </span>
          )}
        </td>
        <td className="border-b border-border px-1.5 py-2 text-sm tabular-nums sm:px-3">
          {weightDisplay}
        </td>
        <td className="border-b border-border px-1.5 py-2 text-sm tabular-nums sm:px-3">
          <div className="flex flex-col">
            <span>{caloriesDisplay}</span>
            {macrosSummary && (
              <span className="text-xs font-normal whitespace-nowrap text-muted-foreground">
                {macrosSummary}
              </span>
            )}
          </div>
        </td>
        <td className="hidden border-b border-border px-3 py-2 text-sm text-muted-foreground sm:table-cell">
          {entry.note || '—'}
        </td>
        <td className="border-b border-border px-1.5 py-2 text-sm sm:px-3">
          {mode === 'confirmDelete' ? (
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span className="text-muted-foreground">
                {t.history.confirmDeleteLabel}
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onDeleted(entry.id)}
              >
                {t.history.confirmDeleteYes}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setMode('view')}>
                {t.history.confirmDeleteNo}
              </Button>
            </div>
          ) : (
            // Tighter than the app's usual icon-sm/gap-1 (#246) — three
            // non-wrapping buttons in one cell is the actual width floor
            // that keeps pushing this column off screen on narrow phones,
            // even after #136 and the macros compact form above already
            // trimmed the other columns as far as they'll go.
            <div className="flex gap-0 sm:gap-1">
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={
                  isExpanded ? t.history.collapseLabel : t.history.expandLabel
                }
                aria-expanded={isExpanded}
                onClick={() => setIsExpanded((prev) => !prev)}
              >
                {isExpanded ? (
                  <ChevronUp aria-hidden="true" />
                ) : (
                  <ChevronDown aria-hidden="true" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={t.history.editLabel}
                onClick={() => setMode('edit')}
              >
                <Pencil aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={t.history.deleteLabel}
                onClick={() => setMode('confirmDelete')}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </div>
          )}
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td
            colSpan={COLUMN_COUNT}
            className="border-b border-border bg-muted/40 px-3 py-3 text-sm"
          >
            <DayDetail entry={entry} onSaved={onSaved} />
          </td>
        </tr>
      )}
    </>
  )
}
