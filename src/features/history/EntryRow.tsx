import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Pencil, Trash2 } from 'lucide-react'
import type { DailyEntry } from '@/domain/dailyEntry'
import { kgToLb, type Goal } from '@/domain/goal'
import {
  formatNumber,
  getDateFnsLocale,
  unitLabel,
  useLocale,
  useTranslation,
} from '@/i18n'
import { DailyEntryForm } from '@/features/daily-log'
import { Button } from '@/shared/ui/button'

const COLUMN_COUNT = 5

export interface EntryRowProps {
  entry: DailyEntry
  goal: Goal | null
  onSaved: (entry: DailyEntry) => void
  onDeleted: (id: string) => void
}

type RowMode = 'view' | 'edit' | 'confirmDelete'

export function EntryRow({ entry, goal, onSaved, onDeleted }: EntryRowProps) {
  const t = useTranslation()
  const locale = useLocale()
  const dateFnsLocale = getDateFnsLocale(locale)
  const [mode, setMode] = useState<RowMode>('view')

  const displayUnit = goal?.displayUnit ?? 'kg'
  const weightDisplay =
    entry.weightKg === undefined
      ? '—'
      : `${formatNumber(displayUnit === 'lb' ? kgToLb(entry.weightKg) : entry.weightKg, locale)} ${unitLabel(displayUnit, t)}`
  const caloriesDisplay =
    entry.caloriesConsumed === undefined
      ? '—'
      : formatNumber(entry.caloriesConsumed, locale, 0)

  if (mode === 'edit') {
    return (
      <tr>
        <td colSpan={COLUMN_COUNT} className="border-b border-border px-3 py-4">
          <DailyEntryForm
            date={entry.date}
            existingEntry={entry}
            onSubmit={(saved) => {
              setMode('view')
              onSaved(saved)
            }}
          />
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => setMode('view')}
          >
            {t.history.cancelButton}
          </Button>
        </td>
      </tr>
    )
  }

  return (
    <tr>
      <td className="border-b border-border px-2 py-2 text-sm whitespace-nowrap sm:px-3">
        {format(parseISO(entry.date), 'PP', { locale: dateFnsLocale })}
      </td>
      <td className="border-b border-border px-2 py-2 text-sm tabular-nums sm:px-3">
        {weightDisplay}
      </td>
      <td className="border-b border-border px-2 py-2 text-sm tabular-nums sm:px-3">
        {caloriesDisplay}
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
  )
}
