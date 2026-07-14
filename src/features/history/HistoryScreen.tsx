import { useState } from 'react'
import { ArrowUpDown } from 'lucide-react'
import { useTranslation } from '@/i18n'
import { EmptyState } from '@/shared/ui/empty-state'
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

  const sorted = [...entries].sort((a, b) =>
    sortAsc ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date),
  )

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
                  <th className={`${COLUMN_HEADER_CLASS} hidden sm:table-cell`}>
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
                  />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
