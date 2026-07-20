import { useState } from 'react'
import { ArrowUpDown } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import type { Emotion } from '@/domain/dailyEntry'
import { isDateWithinReachedWindow, isGoalMetOnDate } from '@/domain/goal'
import { EmotionPicker } from '@/features/daily-log'
import { useTranslation } from '@/i18n'
import { DAY_EMOTIONS } from '@/shared/lib/emotionIcons'
import { Button } from '@/shared/ui/button'
import { EmptyState } from '@/shared/ui/empty-state'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { PageHeader } from '@/shared/ui/page-header'
import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/toggle-group'
import { CalendarView } from './CalendarView'
import { EntryRow } from './EntryRow'
import { MetTargetList } from './MetTargetList'
import { useHistoryData } from './useHistoryData'

const COLUMN_HEADER_CLASS =
  'border-b border-border px-2 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase sm:px-3'

type ViewMode = 'list' | 'calendar'

/** List-view pagination (#162) — a growing history (700-1000+ rows for a
 * multi-year user) shouldn't render every row into the DOM at once. */
const PAGE_SIZE = 20

export function HistoryScreen() {
  const t = useTranslation()
  const { entries, goal, reachedWindows, status, saveEntry, deleteEntry } =
    useHistoryData()
  const [sortAsc, setSortAsc] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  // Deep-linked from a dashboard chart point (#41): ?date=YYYY-MM-DD
  // pre-fills both bounds to that single day, so arriving from a chart
  // lands directly on that day's row instead of the whole table.
  const [searchParams] = useSearchParams()
  const deepLinkedDate = searchParams.get('date') ?? ''
  const [dateFrom, setDateFrom] = useState(deepLinkedDate)
  const [dateTo, setDateTo] = useState(deepLinkedDate)
  // Note-text search + mood filter (#172) — alongside the existing
  // date-range filter, for finding a specific day without scrolling
  // ("that day I wrote about feeling great").
  const [searchText, setSearchText] = useState('')
  const [moodFilter, setMoodFilter] = useState<Emotion | undefined>(undefined)
  const [page, setPage] = useState(0)
  const isFiltering =
    dateFrom !== '' ||
    dateTo !== '' ||
    searchText.trim() !== '' ||
    moodFilter !== undefined

  const normalizedSearch = searchText.trim().toLowerCase()
  const filtered = entries.filter(
    (entry) =>
      (dateFrom === '' || entry.date >= dateFrom) &&
      (dateTo === '' || entry.date <= dateTo) &&
      (normalizedSearch === '' ||
        (entry.note ?? '').toLowerCase().includes(normalizedSearch)) &&
      (moodFilter === undefined || entry.emotion === moodFilter),
  )
  const sorted = [...filtered].sort((a, b) =>
    sortAsc ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date),
  )
  // Clamped at render time, not tracked via a separate reset effect
  // (#162) — correctly snaps back into range whether the page count
  // shrank because a filter narrowed the results or because an entry was
  // deleted, with no dependency list to keep in sync.
  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount - 1)
  const paginated = sorted.slice(
    currentPage * PAGE_SIZE,
    currentPage * PAGE_SIZE + PAGE_SIZE,
  )

  function clearFilter() {
    setDateFrom('')
    setDateTo('')
    setSearchText('')
    setMoodFilter(undefined)
  }

  // From the calendar's day panel (#48): jump to List view filtered to
  // exactly this day. Reuses the existing From/To filter state (#40) —
  // combined with the generalized defaultExpanded check below, this lands
  // the user on List with that one row already expanded, no separate
  // edit-from-calendar UI needed.
  function editDayFromCalendar(date: string) {
    setDateFrom(date)
    setDateTo(date)
    setViewMode('list')
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

          <ToggleGroup
            type="single"
            aria-label={t.history.viewModeLabel}
            value={viewMode}
            onValueChange={(value) => value && setViewMode(value as ViewMode)}
            className="self-start"
          >
            <ToggleGroupItem value="list">
              {t.history.listViewLabel}
            </ToggleGroupItem>
            <ToggleGroupItem value="calendar">
              {t.history.calendarViewLabel}
            </ToggleGroupItem>
          </ToggleGroup>

          {viewMode === 'calendar' ? (
            <CalendarView
              entries={entries}
              reachedWindows={reachedWindows}
              onEditDay={editDayFromCalendar}
              onSaved={saveEntry}
            />
          ) : (
            <>
              <div className="flex flex-col gap-3">
                {/* Fixed width, not relative sizing (#47 recurrence): the
                 * previous grid grid-cols-2 + min-w-0 attempt relied on the
                 * native <input type="date"> control shrinking to fit an
                 * available/relative track — on real mobile Safari it doesn't;
                 * the control has its own rendering-level minimum that ignores
                 * relative width math entirely. An explicit fixed w-36 doesn't
                 * ask the control to shrink at all, it just clamps the box. */}
                <div className="flex flex-wrap items-end gap-3">
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
                      className="h-12 w-36"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="history-date-to">
                      {t.history.dateToLabel}
                    </Label>
                    <Input
                      id="history-date-to"
                      type="date"
                      value={dateTo}
                      min={dateFrom || undefined}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="h-12 w-36"
                    />
                  </div>
                </div>
                {/* Note-text search + mood filter (#172) */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="history-search">
                    {t.history.searchLabel}
                  </Label>
                  <Input
                    id="history-search"
                    type="text"
                    placeholder={t.history.searchPlaceholder}
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="h-12 w-full sm:w-64"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium">
                    {t.history.moodFilterLabel}
                  </span>
                  <EmotionPicker
                    value={moodFilter}
                    onChange={setMoodFilter}
                    options={DAY_EMOTIONS}
                    labelFor={t.dailyEntry.emotionLabel}
                    contextLabel={t.history.moodFilterLabel}
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
                            <ArrowUpDown
                              aria-hidden="true"
                              className="size-3.5"
                            />
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
                      {paginated.map((entry) => (
                        <EntryRow
                          key={entry.id}
                          entry={entry}
                          onSaved={saveEntry}
                          onDeleted={deleteEntry}
                          defaultExpanded={
                            dateFrom !== '' &&
                            entry.date === dateFrom &&
                            entry.date === dateTo
                          }
                          isPartOfReachedGoalWindow={isDateWithinReachedWindow(
                            entry.date,
                            reachedWindows,
                          )}
                          isGoalReachedDay={isGoalMetOnDate(
                            entry.date,
                            reachedWindows,
                          )}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {pageCount > 1 && (
                <div className="flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 0}
                    onClick={() => setPage(currentPage - 1)}
                  >
                    {t.history.previousPageButton}
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {t.history.pageIndicator(currentPage + 1, pageCount)}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={currentPage === pageCount - 1}
                    onClick={() => setPage(currentPage + 1)}
                  >
                    {t.history.nextPageButton}
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
