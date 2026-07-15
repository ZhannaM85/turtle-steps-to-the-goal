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
import {
  formatExactNumber,
  formatNumber,
  getDateFnsLocale,
  unitLabel,
  useLocale,
  useTranslation,
} from '@/i18n'
import { DailyEntryForm } from '@/features/daily-log'
import { macrosSummaryTextCompact } from '@/shared/lib/macroDisplay'
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
}

type RowMode = 'view' | 'edit' | 'confirmDelete'

export function EntryRow({
  entry,
  onSaved,
  onDeleted,
  defaultExpanded = false,
}: EntryRowProps) {
  const t = useTranslation()
  const locale = useLocale()
  const dateFnsLocale = getDateFnsLocale(locale)
  const [mode, setMode] = useState<RowMode>('view')
  // Independent of `mode`: whether the read-only detail panel is open.
  // Kept separate so it survives a confirmDelete round-trip (cancel
  // returns to whatever expand state the row was already in) and is
  // untouched by switching to edit mode.
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const displayUnit = useUnitStore((state) => state.unit)
  const weightDisplay =
    entry.weightKg === undefined
      ? '—'
      : `${formatExactNumber(displayUnit === 'lb' ? kgToLb(entry.weightKg) : entry.weightKg, locale)} ${unitLabel(displayUnit, t)}`
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
        <td colSpan={COLUMN_COUNT} className="border-b border-border px-3 py-4">
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
        <td className="border-b border-border px-2 py-2 text-sm whitespace-nowrap sm:px-3">
          {format(parseISO(entry.date), 'PP', { locale: dateFnsLocale })}
        </td>
        <td className="border-b border-border px-2 py-2 text-sm tabular-nums sm:px-3">
          {weightDisplay}
        </td>
        <td className="border-b border-border px-2 py-2 text-sm tabular-nums sm:px-3">
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
        <td className="border-b border-border px-2 py-2 text-sm sm:px-3">
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
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
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
                size="icon-sm"
                aria-label={t.history.editLabel}
                onClick={() => setMode('edit')}
              >
                <Pencil aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
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
