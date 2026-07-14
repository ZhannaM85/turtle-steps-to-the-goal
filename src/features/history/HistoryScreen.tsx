import { useState } from 'react'
import { ArrowUpDown } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from '@/i18n'
import { Button } from '@/shared/ui/button'
import { EmptyState } from '@/shared/ui/empty-state'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { PageHeader } from '@/shared/ui/page-header'
import { EntryRow } from './EntryRow'
import { MetTargetList } from './MetTargetList'
import { useHistoryData } from './useHistoryData'

const COLUMN_HEADER_CLASS =
  'border-b border-border px-2 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase sm:px-3'

export function HistoryScreen() {
  const t = useTranslation()
  const { entries, goal, status, saveEntry, deleteEntry } = useHistoryData()
  const [sortAsc, setSortAsc] = useState(false)
  // Deep-linked from a dashboard chart point (#41): ?date=YYYY-MM-DD
  // pre-fills both bounds to that single day, so arriving from a chart
  // lands directly on that day's row instead of the whole table.
  const [searchParams] = useSearchParams()
  const deepLinkedDate = searchParams.get('date') ?? ''
  const [dateFrom, setDateFrom] = useState(deepLinkedDate)
  const [dateTo, setDateTo] = useState(deepLinkedDate)
  const isFiltering = dateFrom !== '' || dateTo !== ''

  const filtered = entries.filter(
    (entry) =>
      (dateFrom === '' || entry.date >= dateFrom) &&
      (dateTo === '' || entry.date <= dateTo),
  )
  const sorted = [...filtered].sort((a, b) =>
    sortAsc ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date),
  )

  function clearFilter() {
    setDateFrom('')
    setDateTo('')
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t.history.title} description={t.history.description} />

      {status === 'loading' || status === 'idle' ? (
        <p className="text-sm text-muted-foreground">{t.common.loading}</p>
      ) : entries.length === 0 ? (
        <EmptyState
          title={t.history.emptyTitle}
          description={t.history.emptyDescription}
        />
      ) : (
        <>
          <MetTargetList entries={entries} goal={goal} />

          <div className="flex flex-col gap-3">
            {/* Stacked, not side-by-side (#47 recurrence): native
             * <input type="date"> on mobile Safari has a rendering-level
             * minimum width that ignores CSS min-width/grid-track sizing,
             * so two columns fighting for horizontal space overlap
             * regardless of the layout technique used to divide that
             * space. Full-width stacking removes the competition entirely
             * instead of trying to out-clever the native control. */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="history-date-from">
                {t.history.dateFromLabel}
              </Label>
              <Input
                id="history-date-from"
                type="date"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="history-date-to">{t.history.dateToLabel}</Label>
              <Input
                id="history-date-to"
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            {isFiltering && (
              <Button
                variant="ghost"
                size="sm"
                className="self-start"
                onClick={clearFilter}
              >
                {t.history.clearFilterButton}
              </Button>
            )}
          </div>

          {sorted.length === 0 ? (
            <EmptyState
              title={t.history.noFilterResultsTitle}
              description={t.history.noFilterResultsDescription}
              action={
                <Button variant="outline" size="sm" onClick={clearFilter}>
                  {t.history.clearFilterButton}
                </Button>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr>
                    <th className={COLUMN_HEADER_CLASS}>
                      <button
                        type="button"
                        className="flex items-center gap-1 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                        onClick={() => setSortAsc((prev) => !prev)}
                        aria-label={t.history.sortToggleLabel}
                      >
                        {t.history.dateColumn}
                        <ArrowUpDown aria-hidden="true" className="size-3.5" />
                      </button>
                    </th>
                    <th className={COLUMN_HEADER_CLASS}>
                      {t.history.weightColumn}
                    </th>
                    <th className={COLUMN_HEADER_CLASS}>
                      {t.history.caloriesColumn}
                    </th>
                    <th
                      className={`${COLUMN_HEADER_CLASS} hidden sm:table-cell`}
                    >
                      {t.history.noteColumn}
                    </th>
                    <th className={COLUMN_HEADER_CLASS}>
                      {t.history.actionsColumn}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((entry) => (
                    <EntryRow
                      key={entry.id}
                      entry={entry}
                      onSaved={saveEntry}
                      onDeleted={deleteEntry}
                      defaultExpanded={entry.date === deepLinkedDate}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
